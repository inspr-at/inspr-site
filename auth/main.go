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
	// Shared only with the ordered Traefik edge middleware. Empty is a safe
	// migration state: forwarded identity is ignored and all proxied callers
	// share the direct Traefik bucket until the authoritative edge lands.
	trustedEdgeToken = os.Getenv("ENTER_EDGE_TOKEN")
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
	stateCookieName    = "__Host-inspr_state"
	nonceCookieName    = "__Host-inspr_nonce"
	csrfCookieName     = "__Host-inspr_enter_csrf"
	sessionTTL         = 8 * time.Hour
	stateTTL           = 5 * time.Minute
	csrfTTL            = 5 * time.Minute
	signupRateWindow   = 10 * time.Minute
	signupIPLimit      = 10
	signupEmailLimit   = 3
	signupRateMaxKeys  = 4096
	verifyIPLimit      = 10
	verifyUserLimit    = 3
	enterFormMaxBytes  = 16 << 10
	ownershipLinkTTL   = 24 * time.Hour
	mailCooldown       = 2 * time.Minute
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
	verificationLimiter = newSignupRateLimiter(
		verifyIPLimit,
		verifyUserLimit,
		signupRateWindow,
		signupRateMaxKeys,
	)
	signupDeliveries  = newDeliveryTracker(signupRateMaxKeys)
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
	edgeStatus := "DIRECT-PEER-FALLBACK"
	if trustedEdgeToken != "" {
		edgeStatus = "ATTESTED-PROXY"
	}
	log.Printf("inspr-auth: issuer=%s base=%s listen=%s signup=%s edge=%s",
		issuer, baseURL, listen, signupStatus, edgeStatus)
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
	// If the URL carries an OIDC result, this is the post-IdP redirect. Error
	// and malformed callbacks consume the one-time attempt without echoing
	// provider-controlled details. Only a URL without callback fields may be
	// treated as a refresh of an existing session.
	callback, err := parseLoginCallback(r.URL.RawQuery)
	if err != nil {
		rejectLoginAttempt(w, r, callback.state, err)
		return
	}
	if callback.failure != "" {
		rejectLoginAttempt(w, r, callback.state, callback.failure)
		return
	}
	if callback.code != "" {
		name, err := completeLogin(r.Context(), w, r, callback.code, callback.state)
		if err != nil {
			rejectLoginCallback(w, err)
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

type loginFailure string

func (failure loginFailure) Error() string { return string(failure) }

const (
	loginFailureMissingState          loginFailure = "missing_state_cookie"
	loginFailureMissingNonce          loginFailure = "missing_nonce_cookie"
	loginFailureStateMismatch         loginFailure = "state_mismatch"
	loginFailureTokenExchange         loginFailure = "token_exchange_failed"
	loginFailureMissingIDToken        loginFailure = "id_token_missing"
	loginFailureIDTokenVerification   loginFailure = "id_token_verification_failed"
	loginFailureIDTokenClaims         loginFailure = "id_token_claims_invalid"
	loginFailureNonceMismatch         loginFailure = "nonce_mismatch"
	loginFailureSessionWrite          loginFailure = "session_write_failed"
	loginFailureAuthorizationRejected loginFailure = "authorization_rejected"
	loginFailureResultMissing         loginFailure = "callback_result_missing"
	loginFailureUnknown               loginFailure = "callback_failed"
)

type exchangeCodeFunc func(context.Context, string) (*oauth2.Token, error)
type verifyIDTokenFunc func(context.Context, string) (verifiedLoginToken, error)

type loginCallback struct {
	code    string
	state   string
	failure loginFailure
}

var reservedLoginCallbackParameters = [...]string{
	"code",
	"state",
	"error",
	"error_description",
	"error_uri",
	"iss",
	"session_state",
}

func parseLoginCallback(rawQuery string) (loginCallback, error) {
	query, err := url.ParseQuery(rawQuery)
	if err != nil {
		return loginCallback{}, loginFailureResultMissing
	}

	hasCallbackParameter := false
	for _, name := range reservedLoginCallbackParameters {
		values, present := query[name]
		if !present {
			continue
		}
		hasCallbackParameter = true
		if len(values) != 1 || values[0] == "" {
			return loginCallback{}, loginFailureResultMissing
		}
	}
	if !hasCallbackParameter {
		return loginCallback{}, nil
	}

	code, hasCode := query["code"]
	state, hasState := query["state"]
	callback := loginCallback{}
	if hasState {
		callback.state = state[0]
	}
	_, hasError := query["error"]
	_, hasErrorDescription := query["error_description"]
	_, hasErrorURI := query["error_uri"]
	_, hasIssuer := query["iss"]
	_, hasSessionState := query["session_state"]

	if hasCode && hasError {
		return callback, loginFailureResultMissing
	}
	if (hasErrorDescription || hasErrorURI) && !hasError {
		return callback, loginFailureResultMissing
	}
	if (hasIssuer || hasSessionState) && !hasCode && !hasError {
		return callback, loginFailureResultMissing
	}
	if (hasCode || hasError) && !hasState {
		return callback, loginFailureResultMissing
	}
	if !hasCode && !hasError {
		return callback, loginFailureResultMissing
	}
	if hasError {
		callback.failure = loginFailureAuthorizationRejected
		return callback, nil
	}

	callback.code = code[0]
	return callback, nil
}

func completeLogin(ctx context.Context, w http.ResponseWriter, r *http.Request, code, state string) (string, error) {
	return completeLoginWith(ctx, w, r, code, state,
		func(ctx context.Context, code string) (*oauth2.Token, error) {
			return oauthCfg.Exchange(ctx, code)
		},
		verifyLoginIDToken,
	)
}

func verifyLoginIDToken(ctx context.Context, rawIDToken string) (verifiedLoginToken, error) {
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return verifiedLoginToken{}, loginFailureIDTokenVerification
	}
	var claims loginClaims
	if err := idToken.Claims(&claims); err != nil {
		return verifiedLoginToken{}, loginFailureIDTokenClaims
	}
	return verifiedLoginToken{Nonce: idToken.Nonce, Claims: claims}, nil
}

func completeLoginWith(ctx context.Context, w http.ResponseWriter, r *http.Request, code, state string, exchange exchangeCodeFunc, verify verifyIDTokenFunc) (string, error) {
	// 1. State verification.
	nonce, err := consumeLoginAttempt(w, r, state)
	if err != nil {
		return "", err
	}

	// 2. Code → tokens.
	token, err := exchange(ctx, code)
	if err != nil {
		return "", loginFailureTokenExchange
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return "", loginFailureMissingIDToken
	}

	// 3. ID token signature, standard claims, and authorization-attempt nonce.
	verified, err := verify(ctx, rawIDToken)
	if err != nil {
		return "", safeLoginFailure(err, loginFailureIDTokenVerification)
	}
	if subtle.ConstantTimeCompare([]byte(nonce), []byte(verified.Nonce)) != 1 {
		return "", loginFailureNonceMismatch
	}

	// 4. Pick the friendliest available display name.
	name := firstNonEmpty(verified.Claims.Name, verified.Claims.PreferredUsername, verified.Claims.Email, verified.Claims.Sub)

	// 5. Persist server-stateless session (HMAC-signed cookie).
	if err := writeSession(w, sessionPayload{Name: name, Exp: time.Now().Add(sessionTTL).Unix()}); err != nil {
		return "", loginFailureSessionWrite
	}
	return name, nil
}

func consumeLoginAttempt(w http.ResponseWriter, r *http.Request, callbackState string) (string, error) {
	// Every callback attempt consumes both values, including malformed or
	// failed attempts. The response-side deletion does not affect the request
	// cookies used below.
	clearLoginAttemptCookies(w)

	stateCookie, err := r.Cookie(stateCookieName)
	if err != nil {
		return "", loginFailureMissingState
	}
	nonceCookie, err := r.Cookie(nonceCookieName)
	if err != nil {
		return "", loginFailureMissingNonce
	}
	if subtle.ConstantTimeCompare([]byte(stateCookie.Value), []byte(callbackState)) != 1 {
		return "", loginFailureStateMismatch
	}
	return nonceCookie.Value, nil
}

func rejectLoginAttempt(w http.ResponseWriter, r *http.Request, callbackState string, failure error) {
	if _, err := consumeLoginAttempt(w, r, callbackState); err != nil {
		failure = err
	}
	rejectLoginCallback(w, failure)
}

func safeLoginFailure(err error, fallback loginFailure) loginFailure {
	var failure loginFailure
	if errors.As(err, &failure) {
		return failure
	}
	return fallback
}

func rejectLoginCallback(w http.ResponseWriter, err error) {
	failure := safeLoginFailure(err, loginFailureUnknown)
	log.Printf("welcome: callback failed (%s)", failure)
	http.Error(w, "login failed", http.StatusBadRequest)
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
			renderEnterStatus(w, enterView{
				State:     "signup",
				FormName:  name,
				FormEmail: email,
				FormError: "something didn't land — try again, or sign in if you've been here before.",
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
	now := time.Now()
	deliveryKey := "ownership-link:" + userID + ":" + state
	deliveryExpiry := time.Unix(mustParseUnix(expires), 0)
	deliveryDecision, delivery := signupDeliveries.Start(deliveryKey, now, deliveryExpiry)
	switch deliveryDecision {
	case deliveryAlready:
		if signupDeliveries.Wait(r.Context(), delivery) {
			renderEnter(w, enterView{State: "inbox", OwnershipVerified: true})
		} else {
			renderEnterVerifyFailure(w)
		}
		return
	case deliveryFull:
		renderEnterStatus(w, enterView{State: "signup", FormError: "that link is busy — wait a few minutes and try again."}, http.StatusTooManyRequests)
		return
	}
	if !verificationLimiter.Allow(signupClientIP(r), userID, now) {
		signupDeliveries.Finish(deliveryKey, delivery, false)
		w.Header().Set("Retry-After", strconv.Itoa(int(signupRateWindow.Seconds())))
		renderEnterStatus(w, enterView{State: "signup", FormError: "too many attempts — wait a few minutes and try again."}, http.StatusTooManyRequests)
		return
	}
	err := zitadelCompleteSignup(r.Context(), userID, code)
	if err != nil {
		signupDeliveries.Finish(deliveryKey, delivery, false)
		stage, status := signupFailureDetails(err)
		if status == 0 {
			log.Printf("enter: zitadel verification failed stage=%s status=transport", stage)
		} else {
			log.Printf("enter: zitadel verification failed stage=%s status=%d", stage, status)
		}
		renderEnterVerifyFailure(w)
		return
	}
	signupDeliveries.Finish(deliveryKey, delivery, true)
	renderEnter(w, enterView{State: "inbox", OwnershipVerified: true})
}

func renderEnterVerifyFailure(w http.ResponseWriter) {
	renderEnterStatus(w, enterView{State: "signup", FormError: "that link could not be completed — open it again, or start over."}, http.StatusBadGateway)
}

func mustParseUnix(value string) int64 {
	parsed, _ := strconv.ParseInt(value, 10, 64)
	return parsed
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
// proxy boundary is therefore: current IP resolved from the deployment-owned
// Docker DNS service name "traefik", the plugin's trusted marker, and a secret
// header overwritten only after the Cloudflare source allowlist. Missing or
// mismatched attestation, resolution failure, a different source IP, or
// malformed/conflicting headers all fall back to the non-spoofable peer IP.
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
	edgeToken := r.Header.Get("X-Inspr-Edge-Token")
	if trusted && trustedEdgeToken != "" && subtle.ConstantTimeCompare([]byte(edgeToken), []byte(trustedEdgeToken)) == 1 && r.Header.Get("X-Is-Trusted") == "yes" {
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
	seenAt  time.Time
}

type signupRateLimiter struct {
	mu                  sync.Mutex
	ipEntries           map[string]signupRateEntry
	emailEntries        map[string]signupRateEntry
	ipLimit             int
	emailLimit          int
	window              time.Duration
	maxKeysPerNamespace int
}

func newSignupRateLimiter(ipLimit, emailLimit int, window time.Duration, maxKeys int) *signupRateLimiter {
	return &signupRateLimiter{
		ipEntries:           make(map[string]signupRateEntry),
		emailEntries:        make(map[string]signupRateEntry),
		ipLimit:             ipLimit,
		emailLimit:          emailLimit,
		window:              window,
		maxKeysPerNamespace: maxKeys,
	}
}

// Allow atomically checks and consumes one attempt from both independent
// fixed-window buckets. IP and email keys have separate memory budgets so a
// distributed IP flood cannot consume the email-replay budget. Live IP keys
// are least-recently-seen evicted at capacity; live email keys fail closed so
// eviction cannot reset the per-address mail limit. Existing email keys remain
// usable even when the email namespace is full.
func (l *signupRateLimiter) Allow(ip, email string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	// Hash the normalized email so the bounded process-local map does not retain
	// the address itself after the request completes.
	emailHash := sha256.Sum256([]byte(email))
	ipKey := ip
	emailKey := base64.RawURLEncoding.EncodeToString(emailHash[:])
	l.pruneExpired(now)
	if l.maxKeysPerNamespace <= 0 {
		return false
	}

	ipEntry, ipExists := l.ipEntries[ipKey]
	emailEntry, emailExists := l.emailEntries[emailKey]
	if ipExists {
		ipEntry = currentRateEntry(ipEntry, now, l.window)
		ipEntry.seenAt = now
		if ipEntry.count >= l.ipLimit {
			l.ipEntries[ipKey] = ipEntry
			return false
		}
	}
	if emailExists {
		emailEntry = currentRateEntry(emailEntry, now, l.window)
		emailEntry.seenAt = now
		if emailEntry.count >= l.emailLimit {
			l.emailEntries[emailKey] = emailEntry
			return false
		}
	}
	if !emailExists && len(l.emailEntries) >= l.maxKeysPerNamespace {
		return false
	}
	if !ipExists && len(l.ipEntries) >= l.maxKeysPerNamespace {
		l.evictOldestIP()
	}
	if !ipExists {
		ipEntry = currentRateEntry(signupRateEntry{}, now, l.window)
	}
	if !emailExists {
		emailEntry = currentRateEntry(signupRateEntry{}, now, l.window)
	}

	ipEntry.seenAt = now
	emailEntry.seenAt = now
	ipEntry.count++
	emailEntry.count++
	l.ipEntries[ipKey] = ipEntry
	l.emailEntries[emailKey] = emailEntry
	return true
}

func currentRateEntry(entry signupRateEntry, now time.Time, window time.Duration) signupRateEntry {
	if entry.resetAt.IsZero() || !now.Before(entry.resetAt) {
		return signupRateEntry{resetAt: now.Add(window), seenAt: now}
	}
	return entry
}

func (l *signupRateLimiter) pruneExpired(now time.Time) {
	for key, entry := range l.ipEntries {
		if !now.Before(entry.resetAt) {
			delete(l.ipEntries, key)
		}
	}
	for key, entry := range l.emailEntries {
		if !now.Before(entry.resetAt) {
			delete(l.emailEntries, key)
		}
	}
}

func (l *signupRateLimiter) evictOldestIP() {
	var oldestKey string
	var oldestSeen time.Time
	for key, entry := range l.ipEntries {
		if oldestKey == "" || entry.seenAt.Before(oldestSeen) || (entry.seenAt.Equal(oldestSeen) && key < oldestKey) {
			oldestKey = key
			oldestSeen = entry.seenAt
		}
	}
	if oldestKey != "" {
		delete(l.ipEntries, oldestKey)
	}
}

type deliveryDecision uint8

const (
	deliveryStarted deliveryDecision = iota
	deliveryAlready
	deliveryFull
)

type deliveryEntry struct {
	expiresAt time.Time
	done      chan struct{}
	completed bool
	success   bool
}

// deliveryTracker makes mail-producing operations idempotent without retaining
// email addresses. Entries are bounded and expire; at capacity it fails closed
// rather than dropping a live replay guard. A failed provider operation releases
// its reservation so the legitimate owner can retry.
type deliveryTracker struct {
	mu      sync.Mutex
	entries map[string]*deliveryEntry
	maxKeys int
}

func newDeliveryTracker(maxKeys int) *deliveryTracker {
	return &deliveryTracker{entries: make(map[string]*deliveryEntry), maxKeys: maxKeys}
}

func (t *deliveryTracker) Start(key string, now, expiresAt time.Time) (deliveryDecision, *deliveryEntry) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for existingKey, entry := range t.entries {
		if entry.completed && !now.Before(entry.expiresAt) {
			delete(t.entries, existingKey)
		}
	}
	key = deliveryKey(key)
	if entry, exists := t.entries[key]; exists {
		return deliveryAlready, entry
	}
	if len(t.entries) >= t.maxKeys {
		return deliveryFull, nil
	}
	entry := &deliveryEntry{expiresAt: expiresAt, done: make(chan struct{})}
	t.entries[key] = entry
	return deliveryStarted, entry
}

func (t *deliveryTracker) Finish(key string, entry *deliveryEntry, success bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	key = deliveryKey(key)
	current, exists := t.entries[key]
	if !exists || current != entry || entry.completed {
		return
	}
	entry.completed = true
	entry.success = success
	if !success {
		delete(t.entries, key)
	}
	close(entry.done)
}

// Wait joins an in-flight delivery. The close synchronizes the result write,
// so every follower observes the provider outcome before returning success.
func (t *deliveryTracker) Wait(ctx context.Context, entry *deliveryEntry) bool {
	if entry == nil {
		return false
	}
	select {
	case <-entry.done:
		return entry.success
	case <-ctx.Done():
		return false
	}
}

func (t *deliveryTracker) Record(key string, now, expiresAt time.Time) {
	decision, entry := t.Start(key, now, expiresAt)
	if decision == deliveryStarted {
		t.Finish(key, entry, true)
	}
}

func deliveryKey(value string) string {
	digest := sha256.Sum256([]byte(value))
	return base64.RawURLEncoding.EncodeToString(digest[:])
}

// ── Zitadel management API client ─────────────────────────────────────────

// zitadelStartSignup uses the exact User API contract present in the deployed
// ZITADEL v2.54.8 image. Unlike v1 ImportHumanUser, AddHumanUser does not create
// an Initial-state account: it appends an unverified email-code event whose
// notification link comes back here. Email ownership is still false at create.
//
// Recovery is keyed by ZITADEL's organization-scoped exact email lookup, not
// the locally derived ID. That keeps accounts created under an older COOKIE_KEY
// or provider-generated ID recoverable. New and recovery paths each perform a
// lookup followed by one mail-producing operation and return the same public
// state, avoiding an account-existence signal in status, body, or call count.
func zitadelStartSignup(ctx context.Context, name, email string) error {
	now := time.Now()
	userID, verified, found, err := zitadelFindUserByEmail(ctx, email)
	if err != nil {
		return &signupProviderError{stage: "lookup", cause: err, status: providerHTTPStatus(err)}
	}
	if found {
		return zitadelSendRecoveryMail(ctx, userID, verified, now)
	}

	userID = signupUserID(email)
	ownershipExpiry := now.Add(ownershipLinkTTL)
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
				"urlTemplate": ownershipURLTemplate(userID, ownershipExpiry),
			},
		},
	}
	if _, err := zitadelCall(ctx, http.MethodPost, "/v2beta/users/human", createBody); err == nil {
		signupDeliveries.Record("recovery-ownership:"+userID, now, now.Add(mailCooldown))
		return nil
	} else if status := providerHTTPStatus(err); status != http.StatusBadRequest && status != http.StatusConflict {
		return &signupProviderError{stage: "create", cause: err, status: status}
	}

	// ZITADEL v2.54.8 maps its AlreadyExisting precondition to HTTP 400.
	// A 409 is accepted as well for forward-compatible gateway mappings, but
	// recovery succeeds only after an exact provider-state check.
	userID, verified, found, err = zitadelFindUserByEmail(ctx, email)
	if err != nil || !found {
		return &signupProviderError{stage: "recover", cause: err, status: providerHTTPStatus(err)}
	}
	if verified {
		return zitadelSendRecoveryMail(ctx, userID, true, now)
	}
	return zitadelSendRecoveryMail(ctx, userID, false, now)
}

func zitadelFindUserByEmail(ctx context.Context, email string) (userID string, verified, found bool, err error) {
	searchBody := map[string]any{
		"query": map[string]any{"limit": 2},
		"queries": []any{
			map[string]any{
				"emailQuery": map[string]any{
					"emailAddress": email,
					"method":       "TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE",
				},
			},
		},
	}
	response, err := zitadelCall(ctx, http.MethodPost, "/management/v1/users/_search", searchBody)
	if err != nil {
		return "", false, false, err
	}
	resultValue, hasResults := response["result"]
	if !hasResults {
		// ZITADEL's pinned protojson gateway may omit empty repeated fields.
		// Accept both omission and an explicit [] below; require the details
		// envelope so an unrelated/error body cannot become a zero-match result.
		if _, hasDetails := response["details"]; !hasDetails {
			return "", false, false, errors.New("invalid provider search response")
		}
		return "", false, false, nil
	}
	results, ok := resultValue.([]any)
	if !ok {
		return "", false, false, errors.New("invalid provider search response")
	}
	if len(results) == 0 {
		return "", false, false, nil
	}
	if len(results) > 1 {
		return "", false, false, errors.New("ambiguous provider search response")
	}
	user, _ := results[0].(map[string]any)
	userID, _ = user["id"].(string)
	human, _ := user["human"].(map[string]any)
	emailObject, _ := human["email"].(map[string]any)
	providerEmail, _ := emailObject["email"].(string)
	verified, verifiedOK := emailObject["isEmailVerified"].(bool)
	if !verifiedOK {
		// ZITADEL's pinned protojson gateway may omit an unpopulated false
		// scalar. Missing means false; a present non-boolean remains invalid.
		_, present := emailObject["isEmailVerified"]
		if present {
			return "", false, false, errors.New("invalid provider search result")
		}
		verified = false
	}
	if userID == "" || !strings.EqualFold(providerEmail, email) {
		return "", false, false, errors.New("invalid provider search result")
	}
	return userID, verified, true, nil
}

func zitadelSendRecoveryMail(ctx context.Context, userID string, verified bool, now time.Time) error {
	kind := "ownership"
	if verified {
		kind = "passkey"
	}
	deliveryKey := "recovery-" + kind + ":" + userID
	deliveryDecision, delivery := signupDeliveries.Start(deliveryKey, now, now.Add(mailCooldown))
	switch deliveryDecision {
	case deliveryAlready:
		if signupDeliveries.Wait(ctx, delivery) {
			return nil
		}
		return &signupProviderError{stage: "recovery-wait", cause: errors.New("shared delivery failed")}
	case deliveryFull:
		return &signupProviderError{stage: "recovery-limit", cause: errors.New("delivery tracker full")}
	}

	if verified {
		err := zitadelSendPasswordless(ctx, userID)
		signupDeliveries.Finish(deliveryKey, delivery, err == nil)
		return err
	}
	resendBody := map[string]any{
		"sendCode": map[string]any{
			"urlTemplate": ownershipURLTemplate(userID, now.Add(ownershipLinkTTL)),
		},
	}
	path := "/v2beta/users/" + url.PathEscape(userID) + "/email/resend"
	if _, err := zitadelCall(ctx, http.MethodPost, path, resendBody); err != nil {
		signupDeliveries.Finish(deliveryKey, delivery, false)
		return &signupProviderError{stage: "resend", cause: err, status: providerHTTPStatus(err)}
	}
	signupDeliveries.Finish(deliveryKey, delivery, true)
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

	return zitadelSendPasswordless(ctx, userID)
}

func zitadelSendPasswordless(ctx context.Context, userID string) error {
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
