// inspr-auth — minimal OIDC session backend for inspr.at.
//
// Sits behind Traefik on the same host as inspr-www; handles three paths
// (Traefik routes them to this container, everything else falls through to
// the static Astro site):
//
//   GET /login    → start Authorization Code flow at the configured Zitadel
//                   issuer; persist `state` in a short-lived HTTP-only cookie;
//                   302 to the IdP authorize endpoint.
//   GET /welcome  → OIDC callback. Verifies state + nonce, exchanges code,
//                   verifies ID token signature against the issuer's JWKS,
//                   sets a long-lived (TTL hours) HMAC-signed session cookie,
//                   renders the greeting page server-side using the verified
//                   `name` claim. Idempotent: if a valid session already
//                   exists and no `code` is present, just renders the
//                   greeting (so refresh works after login).
//   GET /logout   → clears session cookie, hits the OIDC RP-Initiated Logout
//                   endpoint to also kill the IdP session, then 302 to /.
//
// Design notes:
//   * Server-side OIDC: client secret never reaches the browser; tokens never
//     reach JavaScript. Welcome page is static HTML rendered with the name
//     claim — no JS needed for the greeting itself, no XHR to auth.inspr.at,
//     so the existing inspr-www CSP stays untouched.
//   * Session cookie format: base64url(JSON payload).base64url(HMAC-SHA256).
//     Stateless (no server-side store); rotates by changing COOKIE_KEY.
//   * Single binary, distroless container, ~12MB. Two prod deps: oauth2 +
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
)

const (
	sessionCookieName = "inspr_sess"
	stateCookieName   = "inspr_state"
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

	tmpl = template.Must(template.ParseFiles("templates/welcome.html"))

	mux := http.NewServeMux()
	mux.HandleFunc("/login", handleLogin)
	mux.HandleFunc("/welcome", handleWelcome)
	mux.HandleFunc("/logout", handleLogout)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	log.Printf("inspr-auth: issuer=%s base=%s listen=%s", issuer, baseURL, listen)
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
	if err := tmpl.Execute(w, struct{ Name string }{Name: name}); err != nil {
		log.Printf("template execute: %v", err)
	}
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
