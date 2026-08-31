// inspr-auth — minimal OIDC session backend for inspr.at.
//
// Sits behind Traefik on the same host as inspr-www; handles three paths
// (Traefik routes them to this container, everything else falls through to
// the static Astro site):
//
//	GET /login    → start Authorization Code flow at the configured Zitadel
//	                issuer; persist independent `state` and `nonce` values in
//	                short-lived HTTP-only cookies; 302 to the IdP authorize
//	                endpoint.
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
	"net/http"
	"net/url"
	"os"
	"strings"
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
	nonceCookieName   = "inspr_nonce"
	sessionTTL        = 8 * time.Hour
	stateTTL          = 5 * time.Minute
)

// ── Globals (set in main()) ───────────────────────────────────────────────

var (
	oauthCfg *oauth2.Config
	verifier *oidc.IDTokenVerifier
	provider *oidc.Provider
	tmpl     *template.Template
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
	// Generate independent, one-time state and nonce values. State binds the
	// callback to this browser request; nonce binds the returned ID token to
	// this exact authorization attempt.
	state := randString(24)
	nonce := randString(24)
	setLoginAttemptCookie(w, stateCookieName, state)
	setLoginAttemptCookie(w, nonceCookieName, nonce)
	authURL := oauthCfg.AuthCodeURL(state, oidc.Nonce(nonce))
	http.Redirect(w, r, authURL, http.StatusFound)
}

func setLoginAttemptCookie(w http.ResponseWriter, name, value string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   int(stateTTL.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

func clearLoginAttemptCookies(w http.ResponseWriter) {
	for _, name := range []string{stateCookieName, nonceCookieName} {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
	}
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

type loginClaims struct {
	Sub               string `json:"sub"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	Email             string `json:"email"`
}

type verifiedLoginToken struct {
	Nonce  string
	Claims loginClaims
}

type exchangeCodeFunc func(context.Context, string) (*oauth2.Token, error)
type verifyIDTokenFunc func(context.Context, string) (verifiedLoginToken, error)

func completeLogin(ctx context.Context, w http.ResponseWriter, r *http.Request, code string) (string, error) {
	return completeLoginWith(ctx, w, r, code,
		func(ctx context.Context, code string) (*oauth2.Token, error) {
			return oauthCfg.Exchange(ctx, code)
		},
		func(ctx context.Context, rawIDToken string) (verifiedLoginToken, error) {
			idToken, err := verifier.Verify(ctx, rawIDToken)
			if err != nil {
				return verifiedLoginToken{}, fmt.Errorf("id_token verify: %w", err)
			}
			var claims loginClaims
			if err := idToken.Claims(&claims); err != nil {
				return verifiedLoginToken{}, fmt.Errorf("claims decode: %w", err)
			}
			return verifiedLoginToken{Nonce: idToken.Nonce, Claims: claims}, nil
		},
	)
}

func completeLoginWith(ctx context.Context, w http.ResponseWriter, r *http.Request, code string, exchange exchangeCodeFunc, verify verifyIDTokenFunc) (string, error) {
	// Every callback attempt consumes both values, including malformed or
	// failed attempts. The response-side deletion does not affect the request
	// cookies used below.
	clearLoginAttemptCookies(w)

	// 1. State verification.
	stateCookie, err := r.Cookie(stateCookieName)
	if err != nil {
		return "", errors.New("missing state cookie")
	}
	nonceCookie, err := r.Cookie(nonceCookieName)
	if err != nil {
		return "", errors.New("missing nonce cookie")
	}
	if subtle.ConstantTimeCompare([]byte(stateCookie.Value), []byte(r.URL.Query().Get("state"))) != 1 {
		return "", errors.New("state mismatch")
	}

	// 2. Code → tokens.
	token, err := exchange(ctx, code)
	if err != nil {
		return "", fmt.Errorf("token exchange: %w", err)
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return "", errors.New("no id_token in token response")
	}

	// 3. ID token signature, standard claims, and authorization-attempt nonce.
	verified, err := verify(ctx, rawIDToken)
	if err != nil {
		return "", err
	}
	if subtle.ConstantTimeCompare([]byte(nonceCookie.Value), []byte(verified.Nonce)) != 1 {
		return "", errors.New("nonce mismatch")
	}

	// 4. Pick the friendliest available display name.
	name := firstNonEmpty(verified.Claims.Name, verified.Claims.PreferredUsername, verified.Claims.Email, verified.Claims.Sub)

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
}

func renderEnter(w http.ResponseWriter, v enterView) {
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
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// /enter has the inline progressive-enhancement script; allow inline
	// script for THIS page only (not exposed via inspr-www's CSP).
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "+
			"font-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; "+
			"frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
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
		if zitadelPAT == "" {
			renderEnter(w, enterView{
				State:     "signup",
				FormName:  r.FormValue("name"),
				FormEmail: r.FormValue("email"),
				FormError: "signup is not configured on this instance.",
			})
			return
		}
		_ = r.ParseForm()
		name := strings.TrimSpace(r.FormValue("name"))
		email := strings.TrimSpace(strings.ToLower(r.FormValue("email")))

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

		// Hand off to Zitadel: create user with passwordless registration.
		// On success, Zitadel returns a one-time link we email to the user.
		err := zitadelCreatePasswordlessUser(r.Context(), name, email)
		if err != nil {
			log.Printf("enter: zitadel signup failed for %q: %v", email, err)
			// Surface a friendly message; full error is in server logs.
			msg := "something didn't land — try again, or sign in if you've been here before."
			if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "AlreadyExists") {
				msg = "looks like you've been here before. try signing in instead."
			}
			renderEnter(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: msg,
			})
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
			"isEmailVerified": true, // we trust the email; signup proves ownership via the link click
		},
		"requestPasswordlessRegistration": true,
	}
	createResp, err := zitadelCall(ctx, http.MethodPost, "/management/v1/users/human/_import", createBody)
	if err != nil {
		return fmt.Errorf("user create: %w", err)
	}
	userID, _ := createResp["userId"].(string)
	if userID == "" {
		return fmt.Errorf("user create: no userId in response: %v", createResp)
	}

	// Trigger Zitadel to send the passwordless-registration email.
	// Endpoint name varies across Zitadel versions; try the v1
	// `_send_passwordless_registration` first, fall back to the
	// passwordless namespace if not found.
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
		if !strings.Contains(err.Error(), "404") && !strings.Contains(err.Error(), "Not Found") {
			break
		}
	}
	// User was created but the email send failed — log and surface as
	// success-with-degradation. The bootstrap admin can resend manually
	// from the Zitadel console.
	log.Printf("enter: user %s (id=%s) created but send-link failed: %v", email, userID, lastErr)
	return nil
}

// zitadelCall makes a JSON request to the Zitadel management API using
// the bootstrap PAT. Returns the decoded response or an error including
// the HTTP status + first 200 chars of the body for diagnostics.
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
		snippet := string(respBody)
		if len(snippet) > 200 {
			snippet = snippet[:200]
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, snippet)
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
