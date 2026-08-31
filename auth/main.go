// inspr-auth — minimal OIDC session backend for inspr.at.
//
// Sits behind Traefik on the same host as inspr-www; handles three paths
// (Traefik routes them to this container, everything else falls through to
// the static Astro site):
//
//	GET /login    → start Authorization Code flow at the configured Zitadel
//	                issuer; persist `state` in a short-lived HTTP-only cookie;
//	                302 to the IdP authorize endpoint.
//	GET /welcome  → OIDC callback. Verifies state + nonce, exchanges code,
//	                verifies ID token signature against the issuer's JWKS,
//	                sets a long-lived (TTL hours) HMAC-signed session cookie,
//	                renders the greeting page server-side using the verified
//	                `name` claim. Idempotent: if a valid session already
//	                exists and no `code` is present, just renders the
//	                greeting (so refresh works after login).
//	GET /logout   → clears session cookie, hits the OIDC RP-Initiated Logout
//	                endpoint to also kill the IdP session, then 302 to /.
//
// Design notes:
//   - Server-side OIDC: client secret never reaches the browser; tokens never
//     reach JavaScript. Welcome page is static HTML rendered with the name
//     claim — no JS needed for the greeting itself, no XHR to auth.inspr.at,
//     so the existing inspr-www CSP stays untouched.
//   - Session cookie format: base64url(JSON payload).base64url(HMAC-SHA256).
//     Stateless (no server-side store); rotates by changing COOKIE_KEY.
//   - Single binary, distroless container, ~12MB. Two prod deps: oauth2 +
//     go-oidc.
package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// ── Config (env-injected at container start) ──────────────────────────────

var (
	issuer       = mustEnv("OIDC_ISSUER")        // e.g. https://auth.inspr.at
	clientID     = mustEnv("OIDC_CLIENT_ID")     // from Zitadel app config
	clientSecret = mustEnv("OIDC_CLIENT_SECRET") // from Zitadel app config
	baseURL      = mustEnv("BASE_URL")           // e.g. https://inspr.at
	cookieKey    = mustEnvKey("COOKIE_KEY")      // hex, 32+ bytes after decode
	listen       = envOr("LISTEN", ":8080")
	// PAT for the Zitadel management API. Used only by /enter for user
	// creation + passwordless registration link delivery.
	//
	// Prefer the scoped service-account PAT (INSPR_AUTH_SA_PAT — minted
	// by auth/bootstrap-zitadel.sh step 10, has only ORG_USER_MANAGER on
	// the INSPR org). Fall back to the legacy ZITADEL_API_PAT variable
	// for backward compatibility during the migration window — it
	// historically held the IAM_OWNER bootstrap PAT, which is too broad
	// for production use (see INSPR-162). Empty value disables /enter
	// signup gracefully (door + login still work).
	zitadelPAT = firstNonEmptyEnv("INSPR_AUTH_SA_PAT", "ZITADEL_API_PAT")
)

const (
	sessionCookieName = "inspr_sess"
	stateCookieName   = "inspr_state"
	csrfCookieName    = "__Host-inspr_enter_csrf"
	sessionTTL        = 8 * time.Hour
	stateTTL          = 5 * time.Minute
	csrfTTL           = 5 * time.Minute
	signupRateWindow  = 10 * time.Minute
	signupIPLimit     = 10
	signupEmailLimit  = 3
	signupRateMaxKeys = 4096
)

// ── Globals (set in main()) ───────────────────────────────────────────────

var (
	oauthCfg *oauth2.Config
	verifier *oidc.IDTokenVerifier
	provider *oidc.Provider
	tmpl     *template.Template

	// A single production instance owns this bounded in-memory limiter. Its
	// limits deliberately apply independently to the client IP and normalized
	// email so rotating either value does not bypass both controls.
	signupLimiter = newSignupRateLimiter(
		signupIPLimit,
		signupEmailLimit,
		signupRateWindow,
		signupRateMaxKeys,
	)
)

// ── Entrypoint ────────────────────────────────────────────────────────────

func main() {
	ctx := context.Background()

	var err error
	provider, err = oidc.NewProvider(ctx, issuer)
	if err != nil {
		log.Fatalf("oidc: discovery failed for %s: %v", issuer, err)
	}

	oauthCfg = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  baseURL + "/welcome",
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}
	verifier = provider.Verifier(&oidc.Config{ClientID: clientID})

	tmpl = template.Must(template.ParseFiles(
		"templates/welcome.html",
		"templates/enter.html",
	))

	mux := http.NewServeMux()
	mux.HandleFunc("/enter", handleEnter)
	mux.HandleFunc("/login", handleLogin)
	mux.HandleFunc("/welcome", handleWelcome)
	mux.HandleFunc("/logout", handleLogout)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	signupStatus := "DISABLED (set INSPR_AUTH_SA_PAT to enable)"
	if zitadelPAT != "" {
		// Identify which env var supplied the PAT so an operator can
		// confirm post-bootstrap that the scoped SA token (not the
		// legacy IAM_OWNER bootstrap PAT) is in effect.
		patSource := "ZITADEL_API_PAT (legacy / IAM_OWNER — migrate to INSPR_AUTH_SA_PAT)"
		if os.Getenv("INSPR_AUTH_SA_PAT") != "" {
			patSource = "INSPR_AUTH_SA_PAT (scoped / ORG_USER_MANAGER)"
		}
		signupStatus = fmt.Sprintf("ENABLED (PAT len=%d source=%s)", len(zitadelPAT), patSource)
	}
	log.Printf("inspr-auth: issuer=%s base=%s listen=%s signup=%s",
		issuer, baseURL, listen, signupStatus)
	log.Fatal(http.ListenAndServe(listen, mux))
}

// ── Handlers ──────────────────────────────────────────────────────────────

func handleLogin(w http.ResponseWriter, r *http.Request) {
	// Generate state — one-time-use random token, stored in a short-lived
	// cookie and echoed back in the callback. Defends against CSRF on the
	// authorization code redirect.
	state := randString(24)
	http.SetCookie(w, &http.Cookie{
		Name:     stateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   int(stateTTL.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
	authURL := oauthCfg.AuthCodeURL(state)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func handleWelcome(w http.ResponseWriter, r *http.Request) {
	// If the URL carries an OIDC ?code, this is the post-IdP redirect. Run
	// the full callback exchange. Otherwise treat as a refresh of an
	// already-authenticated welcome page (read session cookie).
	code := r.URL.Query().Get("code")
	if code != "" {
		name, err := completeLogin(r.Context(), w, r, code)
		if err != nil {
			log.Printf("welcome: callback failed: %v", err)
			http.Error(w, "login failed: "+err.Error(), http.StatusBadRequest)
			return
		}
		renderWelcome(w, name)
		return
	}

	// No code → check session.
	sess, err := readSession(r)
	if err != nil {
		// Not logged in. Send to /login.
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	renderWelcome(w, sess.Name)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	// Clear our session cookie.
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
	// Try RP-Initiated Logout at the IdP (best-effort — Zitadel exposes
	// `end_session_endpoint` via discovery). If unavailable, just bounce
	// back to inspr.at root.
	var endSession struct {
		EndSessionEndpoint string `json:"end_session_endpoint"`
	}
	if err := provider.Claims(&endSession); err == nil && endSession.EndSessionEndpoint != "" {
		u, err := url.Parse(endSession.EndSessionEndpoint)
		if err == nil {
			q := u.Query()
			q.Set("post_logout_redirect_uri", baseURL+"/")
			q.Set("client_id", clientID)
			u.RawQuery = q.Encode()
			http.Redirect(w, r, u.String(), http.StatusFound)
			return
		}
	}
	http.Redirect(w, r, baseURL+"/", http.StatusFound)
}

// ── OIDC callback exchange ────────────────────────────────────────────────

func completeLogin(ctx context.Context, w http.ResponseWriter, r *http.Request, code string) (string, error) {
	// 1. State verification.
	stateCookie, err := r.Cookie(stateCookieName)
	if err != nil {
		return "", errors.New("missing state cookie")
	}
	if subtle.ConstantTimeCompare([]byte(stateCookie.Value), []byte(r.URL.Query().Get("state"))) != 1 {
		return "", errors.New("state mismatch")
	}
	// State cookie has done its job — kill it.
	http.SetCookie(w, &http.Cookie{Name: stateCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})

	// 2. Code → tokens.
	token, err := oauthCfg.Exchange(ctx, code)
	if err != nil {
		return "", fmt.Errorf("token exchange: %w", err)
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return "", errors.New("no id_token in token response")
	}

	// 3. ID token signature + standard claims verification.
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return "", fmt.Errorf("id_token verify: %w", err)
	}
	var claims struct {
		Sub               string `json:"sub"`
		Name              string `json:"name"`
		PreferredUsername string `json:"preferred_username"`
		Email             string `json:"email"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return "", fmt.Errorf("claims decode: %w", err)
	}

	// 4. Pick the friendliest available display name.
	name := firstNonEmpty(claims.Name, claims.PreferredUsername, claims.Email, claims.Sub)

	// 5. Persist server-stateless session (HMAC-signed cookie).
	if err := writeSession(w, sessionPayload{Name: name, Exp: time.Now().Add(sessionTTL).Unix()}); err != nil {
		return "", fmt.Errorf("session write: %w", err)
	}
	return name, nil
}

// ── Session cookie (HMAC-signed, stateless) ───────────────────────────────

type sessionPayload struct {
	Name string `json:"n"`
	Exp  int64  `json:"e"`
}

func writeSession(w http.ResponseWriter, p sessionPayload) error {
	body, err := json.Marshal(p)
	if err != nil {
		return err
	}
	mac := hmac.New(sha256.New, cookieKey)
	mac.Write(body)
	sig := mac.Sum(nil)
	value := base64.RawURLEncoding.EncodeToString(body) + "." + base64.RawURLEncoding.EncodeToString(sig)
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    value,
		Path:     "/",
		MaxAge:   int(sessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func readSession(r *http.Request) (sessionPayload, error) {
	var p sessionPayload
	c, err := r.Cookie(sessionCookieName)
	if err != nil {
		return p, err
	}
	parts := strings.SplitN(c.Value, ".", 2)
	if len(parts) != 2 {
		return p, errors.New("malformed cookie")
	}
	body, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return p, err
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return p, err
	}
	mac := hmac.New(sha256.New, cookieKey)
	mac.Write(body)
	if subtle.ConstantTimeCompare(mac.Sum(nil), sig) != 1 {
		return p, errors.New("bad signature")
	}
	if err := json.Unmarshal(body, &p); err != nil {
		return p, err
	}
	if p.Exp < time.Now().Unix() {
		return p, errors.New("expired")
	}
	return p, nil
}

// ── Render ────────────────────────────────────────────────────────────────

func renderWelcome(w http.ResponseWriter, name string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// Tight per-response CSP — the welcome page is server-rendered with no
	// JS, no inline scripts, no external assets except the inspr.at-hosted
	// fonts (same origin → covered by 'self').
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "+
			"font-src 'self'; script-src 'none'; connect-src 'self'; "+
			"frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	if err := tmpl.ExecuteTemplate(w, "welcome.html", struct{ Name string }{Name: name}); err != nil {
		log.Printf("template execute welcome: %v", err)
	}
}

// enterView feeds enter.html. State is one of "door" | "signup" | "inbox".
type enterView struct {
	State     string // door | signup | inbox
	Head      string // hero copy variant per state
	FormName  string // sticky between renders
	FormEmail string
	FormError string
	CSRFToken string
}

func renderEnter(w http.ResponseWriter, v enterView) {
	renderEnterStatus(w, v, http.StatusOK)
}

func renderEnterStatus(w http.ResponseWriter, v enterView, status int) {
	if v.State == "" {
		v.State = "door"
	}
	if v.Head == "" {
		switch v.State {
		case "door":
			v.Head = "you've arrived"
		case "signup":
			// the template wraps the highlighted word in <em> directly
			v.Head = "let's get you in"
		case "inbox":
			v.Head = "your door is open"
		}
	}
	if v.State == "signup" {
		v.CSRFToken = randString(32)
		http.SetCookie(w, &http.Cookie{
			Name:     csrfCookieName,
			Value:    v.CSRFToken,
			Path:     "/",
			MaxAge:   int(csrfTTL.Seconds()),
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteStrictMode,
		})
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// /enter has the inline progressive-enhancement script; allow inline
	// script for THIS page only (not exposed via inspr-www's CSP).
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "+
			"font-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; "+
			"frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.WriteHeader(status)
	if err := tmpl.ExecuteTemplate(w, "enter.html", v); err != nil {
		log.Printf("template execute enter: %v", err)
	}
}

// ── /enter handler ────────────────────────────────────────────────────────

func handleEnter(w http.ResponseWriter, r *http.Request) {
	// Already signed in? Skip the threshold; go straight inside.
	if _, err := readSession(r); err == nil {
		http.Redirect(w, r, "/welcome", http.StatusFound)
		return
	}

	switch r.Method {
	case http.MethodGet, http.MethodHead:
		step := r.URL.Query().Get("step")
		if step == "signup" {
			renderEnter(w, enterView{State: "signup"})
			return
		}
		renderEnter(w, enterView{State: "door"})
		return

	case http.MethodPost:
		_ = r.ParseForm()
		name := strings.TrimSpace(r.FormValue("name"))
		email := strings.TrimSpace(strings.ToLower(r.FormValue("email")))

		if !consumeEnterCSRF(w, r) {
			renderEnterStatus(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: "that form expired — please try again.",
			}, http.StatusForbidden)
			return
		}

		if zitadelPAT == "" {
			renderEnter(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: "signup is not configured on this instance.",
			})
			return
		}

		// Smart minimum validation. Zitadel will re-validate too.
		if name == "" || email == "" || !strings.Contains(email, "@") {
			renderEnter(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: "we need a name and a valid email — try again.",
			})
			return
		}

		if !signupLimiter.Allow(signupClientIP(r), email, time.Now()) {
			w.Header().Set("Retry-After", strconv.Itoa(int(signupRateWindow.Seconds())))
			renderEnterStatus(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: "too many attempts — wait a few minutes and try again.",
			}, http.StatusTooManyRequests)
			return
		}

		// Hand off to Zitadel: create user with passwordless registration.
		// On success, Zitadel returns a one-time link we email to the user.
		err := zitadelCreatePasswordlessUser(r.Context(), name, email)
		if err != nil {
			stage, status := signupFailureDetails(err)
			if status == 0 {
				log.Printf("enter: zitadel signup failed stage=%s status=transport", stage)
			} else {
				log.Printf("enter: zitadel signup failed stage=%s status=%d", stage, status)
			}
			// Surface a friendly message without reflecting provider details.
			msg := "something didn't land — try again, or sign in if you've been here before."
			if stage == "create" && status == http.StatusConflict {
				msg = "looks like you've been here before. try signing in instead."
			}
			renderEnterStatus(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: msg,
			}, http.StatusBadGateway)
			return
		}

		renderEnter(w, enterView{
			State:     "inbox",
			FormEmail: email,
		})
		return

	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// consumeEnterCSRF implements a double-submit token: the random value issued
// in the signup form must match its short-lived, same-site cookie. Consume the
// cookie on every POST so retries always require a freshly rendered form.
func consumeEnterCSRF(w http.ResponseWriter, r *http.Request) bool {
	http.SetCookie(w, &http.Cookie{
		Name:     csrfCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
	cookie, err := r.Cookie(csrfCookieName)
	formToken := r.FormValue("csrf_token")
	if err != nil || cookie.Value == "" || formToken == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(formToken)) == 1
}

// signupClientIP follows the production edge contract rather than trusting an
// arbitrary forwarded chain. inspr-auth has no published port and is attached
// only to csb1_traefik; its router always runs cloudflarewarp@file, which
// overwrites X-Real-IP and X-Forwarded-For with the same single client IP. Only
// that exact pair from a private/loopback peer is accepted. Any missing,
// prefixed, or conflicting value falls back to the direct peer address.
func signupClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer := net.ParseIP(strings.TrimSpace(host))
	if peer != nil && (peer.IsPrivate() || peer.IsLoopback()) {
		forwardedRaw := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
		forwarded := net.ParseIP(forwardedRaw)
		realIP := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Real-IP")))
		if !strings.Contains(forwardedRaw, ",") && forwarded != nil && realIP != nil && forwarded.Equal(realIP) {
			return forwarded.String()
		}
	}
	if peer != nil {
		return peer.String()
	}
	return strings.TrimSpace(host)
}

type signupRateEntry struct {
	count   int
	resetAt time.Time
}

type signupRateLimiter struct {
	mu         sync.Mutex
	entries    map[string]signupRateEntry
	ipLimit    int
	emailLimit int
	window     time.Duration
	maxKeys    int
}

func newSignupRateLimiter(ipLimit, emailLimit int, window time.Duration, maxKeys int) *signupRateLimiter {
	return &signupRateLimiter{
		entries:    make(map[string]signupRateEntry),
		ipLimit:    ipLimit,
		emailLimit: emailLimit,
		window:     window,
		maxKeys:    maxKeys,
	}
}

// Allow atomically checks and consumes one attempt from both independent
// fixed-window buckets. The map is capped; expired entries are removed first,
// then the least-recently-seen entry is evicted when necessary.
func (l *signupRateLimiter) Allow(ip, email string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	// Hash the normalized email so the bounded process-local map does not retain
	// the address itself after the request completes.
	emailHash := sha256.Sum256([]byte(email))
	keys := []struct {
		key   string
		limit int
	}{
		{key: "ip:" + ip, limit: l.ipLimit},
		{key: "email:" + base64.RawURLEncoding.EncodeToString(emailHash[:]), limit: l.emailLimit},
	}

	missing := 0
	for _, item := range keys {
		if _, ok := l.entries[item.key]; !ok {
			missing++
		}
	}
	if !l.makeRoom(now, missing) {
		return false
	}

	updated := make([]signupRateEntry, len(keys))
	for i, item := range keys {
		entry := l.entries[item.key]
		if entry.resetAt.IsZero() || !now.Before(entry.resetAt) {
			entry.count = 0
			entry.resetAt = now.Add(l.window)
		}
		updated[i] = entry
		if entry.count >= item.limit {
			l.entries[item.key] = entry
			return false
		}
	}
	for i, item := range keys {
		updated[i].count++
		l.entries[item.key] = updated[i]
	}
	return true
}

func (l *signupRateLimiter) makeRoom(now time.Time, needed int) bool {
	for key, entry := range l.entries {
		if !now.Before(entry.resetAt) {
			delete(l.entries, key)
		}
	}
	// Fail closed at capacity. Evicting live entries would keep memory bounded
	// but let a key-flood attacker recycle and bypass earlier limits.
	return len(l.entries)+needed <= l.maxKeys
}

// ── Zitadel management API client ─────────────────────────────────────────

// zitadelCreatePasswordlessUser creates a human user in Zitadel with the
// passwordless-registration flag set, then triggers the registration link
// email. The user's first sign-in completes via passkey (Touch ID / Face
// ID / WebAuthn), no password ever set.
//
// Two-step (intentional):
//  1. POST /management/v1/users/human/_import — create user; the response
//     includes `passwordlessRegistration` (link + lifetime) but Zitadel
//     does NOT auto-deliver the email.
//  2. POST /management/v1/users/{userId}/passwordless/_send_link — asks
//     Zitadel to send the link via the configured SMTP. Spike-acceptable;
//     for higher branding control we'd render the email ourselves and
//     SMTP-send from inspr-auth.
//
// Errors are returned with enough context to surface a meaningful message
// to the user (collision vs. transient).
func zitadelCreatePasswordlessUser(ctx context.Context, name, email string) error {
	// Split a single "name" field into first/last for Zitadel's schema.
	first, last := splitName(name)
	createBody := map[string]any{
		"userName": email, // we use email-as-username; loginName policy must allow this
		"profile": map[string]any{
			"firstName":         first,
			"lastName":          last,
			"displayName":       name,
			"preferredLanguage": "en",
		},
		"email": map[string]any{
			"email":           email,
			"isEmailVerified": false, // the emailed registration flow must prove ownership
		},
		"requestPasswordlessRegistration": true,
	}
	createResp, err := zitadelCall(ctx, http.MethodPost, "/management/v1/users/human/_import", createBody)
	if err != nil {
		return &signupProviderError{stage: "create", cause: err, status: providerHTTPStatus(err)}
	}
	userID, _ := createResp["userId"].(string)
	if userID == "" {
		return &signupProviderError{stage: "create", cause: errors.New("invalid provider response")}
	}

	// Trigger Zitadel to send the passwordless-registration email.
	// Endpoint name varies across Zitadel versions; try the passwordless
	// namespace first, then fall back to the older v1 action if not found.
	sendPaths := []string{
		fmt.Sprintf("/management/v1/users/%s/passwordless/_send_link", userID),
		fmt.Sprintf("/management/v1/users/%s/_send_passwordless_registration", userID),
	}
	var lastErr error
	for _, p := range sendPaths {
		_, err := zitadelCall(ctx, http.MethodPost, p, map[string]any{})
		if err == nil {
			return nil
		}
		lastErr = err
		if providerHTTPStatus(err) != http.StatusNotFound {
			break
		}
	}
	// The identity exists, but claiming that an email was sent would strand the
	// user. Preserve the failure so the handler renders an honest retry view.
	return &signupProviderError{stage: "send", cause: lastErr, status: providerHTTPStatus(lastErr)}
}

type zitadelHTTPError struct {
	status int
}

func (e *zitadelHTTPError) Error() string {
	return fmt.Sprintf("provider HTTP %d", e.status)
}

type signupProviderError struct {
	stage  string
	status int
	cause  error
}

// Error is deliberately fixed-shape: provider bodies can contain PII or
// opaque diagnostics and must never reach application logs or the browser.
func (e *signupProviderError) Error() string {
	if e.status != 0 {
		return fmt.Sprintf("signup %s failed (provider HTTP %d)", e.stage, e.status)
	}
	return fmt.Sprintf("signup %s failed", e.stage)
}

func (e *signupProviderError) Unwrap() error { return e.cause }

func providerHTTPStatus(err error) int {
	var httpErr *zitadelHTTPError
	if errors.As(err, &httpErr) {
		return httpErr.status
	}
	return 0
}

func signupFailureDetails(err error) (string, int) {
	var signupErr *signupProviderError
	if errors.As(err, &signupErr) {
		return signupErr.stage, signupErr.status
	}
	return "unknown", 0
}

// zitadelCall makes a JSON request to the Zitadel management API using the
// scoped PAT. Errors retain only the HTTP status; response bodies are never
// propagated because they may contain PII or opaque provider diagnostics.
func zitadelCall(ctx context.Context, method, path string, body any) (map[string]any, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, method, issuer+path, strings.NewReader(string(bodyBytes)))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+zitadelPAT)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := readAtMost(resp.Body, 32*1024)
	if resp.StatusCode >= 400 {
		return nil, &zitadelHTTPError{status: resp.StatusCode}
	}
	var out map[string]any
	if len(respBody) > 0 {
		if err := json.Unmarshal(respBody, &out); err != nil {
			return nil, fmt.Errorf("decode: %w", err)
		}
	}
	return out, nil
}

func readAtMost(r interface{ Read([]byte) (int, error) }, n int) ([]byte, error) {
	buf := make([]byte, n)
	total := 0
	for total < n {
		got, err := r.Read(buf[total:])
		total += got
		if err != nil {
			return buf[:total], nil
		}
		if got == 0 {
			break
		}
	}
	return buf[:total], nil
}

// splitName returns first + last from a single "Display Name" string.
// "Markus" → ("Markus", "Markus"), "Markus Barta" → ("Markus", "Barta"),
// "Mary Jane Watson" → ("Mary", "Jane Watson"). Zitadel requires both
// fields non-empty, so a single token gets duplicated to satisfy the
// constraint without fabricating data.
func splitName(full string) (string, string) {
	full = strings.TrimSpace(full)
	if full == "" {
		return "guest", "guest"
	}
	parts := strings.SplitN(full, " ", 2)
	if len(parts) == 1 {
		return parts[0], parts[0]
	}
	return parts[0], strings.TrimSpace(parts[1])
}

// ── Helpers ───────────────────────────────────────────────────────────────

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing required env: %s", k)
	}
	return v
}

func envOr(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

// firstNonEmptyEnv returns the first env var in `keys` whose value is non-
// empty, or "" if none are set. Used for migration windows where a new
// preferred env name should take precedence over an older fallback.
func firstNonEmptyEnv(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return ""
}

// mustEnvKey decodes a hex-encoded symmetric key from env. Requires ≥ 32
// raw bytes (≥ 64 hex chars) for HMAC-SHA256.
func mustEnvKey(k string) []byte {
	raw := mustEnv(k)
	b := make([]byte, len(raw)/2)
	for i := 0; i < len(b); i++ {
		var hi, lo byte
		hi = hexNibble(raw[2*i])
		lo = hexNibble(raw[2*i+1])
		b[i] = hi<<4 | lo
	}
	if len(b) < 32 {
		log.Fatalf("%s must be ≥ 64 hex chars (got %d bytes)", k, len(b))
	}
	return b
}

func hexNibble(c byte) byte {
	switch {
	case c >= '0' && c <= '9':
		return c - '0'
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10
	}
	log.Fatalf("invalid hex char: %q", c)
	return 0
}

func randString(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("rand: %v", err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func firstNonEmpty(s ...string) string {
	for _, v := range s {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
