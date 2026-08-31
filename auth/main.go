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
	"io"
	"log"
	"mime"
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
	// Only this Docker DNS identity is allowed to supply the client-address
	// headers used by /enter. The deployed compose service is named traefik;
	// unrelated peers on the shared bridge cannot claim its source address.
	trustedProxyHost = envOr("ENTER_TRUSTED_PROXY_HOST", "traefik")
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
	sessionCookieName  = "inspr_sess"
	stateCookieName    = "inspr_state"
	csrfCookieName     = "__Host-inspr_enter_csrf"
	sessionTTL         = 8 * time.Hour
	stateTTL           = 5 * time.Minute
	csrfTTL            = 5 * time.Minute
	signupRateWindow   = 10 * time.Minute
	signupIPLimit      = 10
	signupEmailLimit   = 3
	signupRateMaxKeys  = 4096
	enterFormMaxBytes  = 16 << 10
	ownershipLinkTTL   = 24 * time.Hour
	zitadelHTTPTimeout = 10 * time.Second
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
	zitadelHTTPClient = &http.Client{Timeout: zitadelHTTPTimeout}
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
	mux.HandleFunc("/enter/verify", handleEnterVerify)
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
	server := &http.Server{
		Addr:              listen,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    32 << 10,
	}
	log.Fatal(server.ListenAndServe())
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
	State             string // door | signup | inbox
	Head              string // hero copy variant per state
	FormName          string // sticky between renders
	FormEmail         string
	FormError         string
	CSRFToken         string
	OwnershipVerified bool
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
		// Bound and parse the unauthenticated body before CSRF, limiter, or
		// provider work. MaxBytesReader returns a typed error after the cap and
		// prevents ParseForm from consuming an attacker-sized request.
		r.Body = http.MaxBytesReader(w, r.Body, enterFormMaxBytes)
		mediaType, _, mediaErr := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if mediaErr != nil || mediaType != "application/x-www-form-urlencoded" {
			renderEnterStatus(w, enterView{State: "signup", FormError: "that form could not be read — please try again."}, http.StatusBadRequest)
			return
		}
		if err := r.ParseForm(); err != nil {
			status := http.StatusBadRequest
			message := "that form could not be read — please try again."
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				status = http.StatusRequestEntityTooLarge
				message = "that form is too large — please try again."
			}
			renderEnterStatus(w, enterView{State: "signup", FormError: message}, status)
			return
		}
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
		if name == "" || email == "" || len(name) > 200 || len(email) > 200 || !strings.Contains(email, "@") {
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

		// ZITADEL v2 atomically creates an active human with an explicitly
		// unverified email and queues the ownership-code mail. A retry after a
		// lost response or partial delivery resends that code to the exact
		// provider-held address instead of attempting a second import.
		err := zitadelStartSignup(r.Context(), name, email)
		if err != nil {
			stage, status := signupFailureDetails(err)
			if status == 0 {
				log.Printf("enter: zitadel signup failed stage=%s status=transport", stage)
			} else {
				log.Printf("enter: zitadel signup failed stage=%s status=%d", stage, status)
			}
			// Surface a friendly message without reflecting provider details.
			msg := "something didn't land — try again, or sign in if you've been here before."
			if stage == "existing" {
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

// handleEnterVerify consumes the ownership proof ZITADEL sent to the address.
// A passkey registration mail is requested only after VerifyEmail succeeds. The
// signed state permits a safe retry after email verification succeeded but the
// passkey-mail request failed; it cannot be minted by another shared-network
// peer or by a caller who merely knows a user ID.
func handleEnterVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	q := r.URL.Query()
	userID := q.Get("userID")
	code := q.Get("code")
	expires := q.Get("expires")
	state := q.Get("state")
	if len(userID) == 0 || len(userID) > 200 || len(code) == 0 || len(code) > 20 || !validOwnershipState(userID, expires, state, time.Now()) {
		renderEnterStatus(w, enterView{State: "signup", FormError: "that link is invalid or expired — start again."}, http.StatusBadRequest)
		return
	}
	err := zitadelCompleteSignup(r.Context(), userID, code)
	if err != nil {
		stage, status := signupFailureDetails(err)
		if status == 0 {
			log.Printf("enter: zitadel verification failed stage=%s status=transport", stage)
		} else {
			log.Printf("enter: zitadel verification failed stage=%s status=%d", stage, status)
		}
		renderEnterStatus(w, enterView{State: "signup", FormError: "that link could not be completed — open it again, or start over."}, http.StatusBadGateway)
		return
	}
	renderEnter(w, enterView{State: "inbox", OwnershipVerified: true})
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
// arbitrary private peer. inspr-auth has no published port and is attached to
// csb1_traefik, a bridge shared by unrelated containers. The only authoritative
// proxy boundary is therefore the current IP resolved from the deployment-owned
// Docker DNS service name "traefik". Resolution failure, a different source IP,
// or malformed/conflicting headers all fall back to the non-spoofable peer IP.
func signupClientIP(r *http.Request) string {
	return signupClientIPWithResolver(r, net.DefaultResolver.LookupIPAddr)
}

type proxyIPResolver func(context.Context, string) ([]net.IPAddr, error)

func signupClientIPWithResolver(r *http.Request, resolve proxyIPResolver) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer := net.ParseIP(strings.TrimSpace(host))
	trusted := false
	if peer != nil && trustedProxyHost != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
		defer cancel()
		if addresses, lookupErr := resolve(ctx, trustedProxyHost); lookupErr == nil {
			for _, address := range addresses {
				if peer.Equal(address.IP) {
					trusted = true
					break
				}
			}
		}
	}
	if trusted {
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

// zitadelStartSignup uses the exact User API contract present in the deployed
// ZITADEL v2.54.8 image. Unlike v1 ImportHumanUser, AddHumanUser does not create
// an Initial-state account: it appends an unverified email-code event whose
// notification link comes back here. Email ownership is still false at create.
//
// The HMAC-derived user ID makes creation idempotent without retaining email in
// process memory. If the create response was lost, or the first notification
// did not arrive, a retry can prove that exact user/email pair is still
// unverified and ask ZITADEL to resend its email code. It never re-imports.
func zitadelStartSignup(ctx context.Context, name, email string) error {
	userID := signupUserID(email)
	first, last := splitName(name)
	createBody := map[string]any{
		"userId":   userID,
		"username": email,
		"profile": map[string]any{
			"givenName":         first,
			"familyName":        last,
			"displayName":       name,
			"preferredLanguage": "en",
		},
		"email": map[string]any{
			"email": email,
			"sendCode": map[string]any{
				"urlTemplate": ownershipURLTemplate(userID, time.Now().Add(ownershipLinkTTL)),
			},
		},
	}
	if _, err := zitadelCall(ctx, http.MethodPost, "/v2beta/users/human", createBody); err == nil {
		return nil
	} else if status := providerHTTPStatus(err); status != http.StatusBadRequest && status != http.StatusConflict {
		return &signupProviderError{stage: "create", cause: err, status: status}
	}

	// ZITADEL v2.54.8 maps its AlreadyExisting precondition to HTTP 400.
	// A 409 is accepted as well for forward-compatible gateway mappings, but
	// recovery succeeds only after an exact provider-state check.
	verified, providerEmail, err := zitadelUserEmailState(ctx, userID)
	if err != nil || !strings.EqualFold(providerEmail, email) {
		return &signupProviderError{stage: "recover", cause: err, status: providerHTTPStatus(err)}
	}
	if verified {
		return &signupProviderError{stage: "existing", cause: errors.New("email already verified"), status: http.StatusConflict}
	}
	resendBody := map[string]any{
		"sendCode": map[string]any{
			"urlTemplate": ownershipURLTemplate(userID, time.Now().Add(ownershipLinkTTL)),
		},
	}
	path := "/v2beta/users/" + url.PathEscape(userID) + "/email/resend"
	if _, err := zitadelCall(ctx, http.MethodPost, path, resendBody); err != nil {
		return &signupProviderError{stage: "resend", cause: err, status: providerHTTPStatus(err)}
	}
	return nil
}

// zitadelCompleteSignup verifies the emailed code, then requests a passwordless
// registration mail through the exact v2.54.8 management API, whose user.write
// permission is present in the scoped ORG_USER_MANAGER role. A consumed
// verification code is recoverable only when the separately HMAC-authenticated
// link reached a provider-confirmed verified user; this covers
// verify-success/passkey-request-failure retries.
func zitadelCompleteSignup(ctx context.Context, userID, verificationCode string) error {
	verifyPath := "/v2beta/users/" + url.PathEscape(userID) + "/email/verify"
	_, verifyErr := zitadelCall(ctx, http.MethodPost, verifyPath, map[string]any{"verificationCode": verificationCode})
	if verifyErr != nil {
		verified, _, stateErr := zitadelUserEmailState(ctx, userID)
		if stateErr != nil || !verified {
			return &signupProviderError{stage: "verify", cause: verifyErr, status: providerHTTPStatus(verifyErr)}
		}
	}

	passkeyPath := "/management/v1/users/" + url.PathEscape(userID) + "/passwordless/_send_link"
	_, err := zitadelCall(ctx, http.MethodPost, passkeyPath, map[string]any{})
	if err != nil {
		return &signupProviderError{stage: "passkey", cause: err, status: providerHTTPStatus(err)}
	}
	return nil
}

func zitadelUserEmailState(ctx context.Context, userID string) (verified bool, email string, err error) {
	response, err := zitadelCall(ctx, http.MethodGet, "/v2beta/users/"+url.PathEscape(userID), nil)
	if err != nil {
		return false, "", err
	}
	user, _ := response["user"].(map[string]any)
	human, _ := user["human"].(map[string]any)
	emailObject, _ := human["email"].(map[string]any)
	email, _ = emailObject["email"].(string)
	verified, ok := emailObject["isVerified"].(bool)
	if email == "" || !ok {
		return false, "", errors.New("invalid provider response")
	}
	return verified, email, nil
}

func signupUserID(email string) string {
	mac := hmac.New(sha256.New, cookieKey)
	_, _ = mac.Write([]byte("enter-user\x00" + strings.ToLower(strings.TrimSpace(email))))
	return "signup-" + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func ownershipURLTemplate(userID string, expires time.Time) string {
	expiresText := strconv.FormatInt(expires.Unix(), 10)
	state := ownershipState(userID, expiresText)
	// Keep the three ZITADEL Go-template actions literal. Query.Encode would
	// percent-escape their braces before ZITADEL can render them.
	return baseURL + "/enter/verify?userID={{.UserID}}&code={{.Code}}&orgID={{.OrgID}}&expires=" +
		url.QueryEscape(expiresText) + "&state=" + url.QueryEscape(state)
}

func ownershipState(userID, expires string) string {
	mac := hmac.New(sha256.New, cookieKey)
	_, _ = mac.Write([]byte("enter-ownership\x00" + userID + "\x00" + expires))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func validOwnershipState(userID, expires, state string, now time.Time) bool {
	expiresUnix, err := strconv.ParseInt(expires, 10, 64)
	if err != nil || expiresUnix < now.Unix() || expiresUnix > now.Add(ownershipLinkTTL+time.Minute).Unix() {
		return false
	}
	expected := ownershipState(userID, expires)
	return subtle.ConstantTimeCompare([]byte(expected), []byte(state)) == 1
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
	var requestBody io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal: %w", err)
		}
		requestBody = strings.NewReader(string(bodyBytes))
	}
	req, err := http.NewRequestWithContext(ctx, method, issuer+path, requestBody)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+zitadelPAT)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := zitadelHTTPClient.Do(req)
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
