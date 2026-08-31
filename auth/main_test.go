package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	htmltemplate "html/template"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	texttemplate "text/template"
	"time"
)

type capturedRequest struct {
	method string
	path   string
	body   map[string]any
}

type stubUser struct {
	email    string
	verified bool
}

type zitadelStub struct {
	mu                    sync.Mutex
	requests              []capturedRequest
	users                 map[string]*stubUser
	createCalls           int
	resendCalls           int
	verifyCalls           int
	passkeyCalls          int
	failFirstCreateCommit bool
	createFailureStatus   int
	passkeyFailures       int
	errorBody             string
	lastURLTemplate       string
}

func (s *zitadelStub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.users == nil {
		s.users = make(map[string]*stubUser)
	}
	var body map[string]any
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&body)
	}
	s.requests = append(s.requests, capturedRequest{method: r.Method, path: r.URL.Path, body: body})
	w.Header().Set("Content-Type", "application/json")

	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/v2beta/users/human":
		s.createCalls++
		userID, _ := body["userId"].(string)
		emailObject, _ := body["email"].(map[string]any)
		email, _ := emailObject["email"].(string)
		sendCode, _ := emailObject["sendCode"].(map[string]any)
		s.lastURLTemplate, _ = sendCode["urlTemplate"].(string)
		if _, exists := s.users[userID]; exists {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(s.errorBody))
			return
		}
		if userID != "" && email != "" {
			s.users[userID] = &stubUser{email: email}
		}
		if s.createFailureStatus != 0 || (s.failFirstCreateCommit && s.createCalls == 1) {
			status := s.createFailureStatus
			if status == 0 {
				status = http.StatusBadGateway
			}
			w.WriteHeader(status)
			_, _ = w.Write([]byte(s.errorBody))
			return
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = fmt.Fprintf(w, `{"userId":%q}`, userID)

	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/v2beta/users/"):
		userID, _ := url.PathUnescape(strings.TrimPrefix(r.URL.Path, "/v2beta/users/"))
		user := s.users[userID]
		if user == nil {
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(s.errorBody))
			return
		}
		_, _ = fmt.Fprintf(w, `{"user":{"human":{"email":{"email":%q,"isVerified":%t}}}}`, user.email, user.verified)

	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/email/resend"):
		s.resendCalls++
		sendCode, _ := body["sendCode"].(map[string]any)
		s.lastURLTemplate, _ = sendCode["urlTemplate"].(string)
		_, _ = w.Write([]byte(`{}`))

	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/email/verify"):
		s.verifyCalls++
		userID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/v2beta/users/"), "/email/verify")
		userID, _ = url.PathUnescape(userID)
		user := s.users[userID]
		code, _ := body["verificationCode"].(string)
		if user == nil || code != "email-code" || user.verified {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(s.errorBody))
			return
		}
		user.verified = true
		_, _ = w.Write([]byte(`{}`))

	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/passwordless/_send_link"):
		s.passkeyCalls++
		userID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/management/v1/users/"), "/passwordless/_send_link")
		userID, _ = url.PathUnescape(userID)
		user := s.users[userID]
		if user == nil || !user.verified {
			w.WriteHeader(http.StatusPreconditionFailed)
			return
		}
		if s.passkeyFailures > 0 {
			s.passkeyFailures--
			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte(s.errorBody))
			return
		}
		_, _ = w.Write([]byte(`{}`))

	default:
		http.NotFound(w, r)
	}
}

func installEnterTestState(t *testing.T, serverURL string, limiter *signupRateLimiter) {
	t.Helper()
	oldIssuer, oldBaseURL := issuer, baseURL
	oldPAT, oldProxyHost, oldEdgeToken := zitadelPAT, trustedProxyHost, trustedEdgeToken
	oldLimiter, oldVerificationLimiter := signupLimiter, verificationLimiter
	oldDeliveries, oldTemplate := signupDeliveries, tmpl
	issuer = serverURL
	baseURL = "https://inspr.example"
	zitadelPAT = "test-pat"
	trustedProxyHost = "traefik"
	trustedEdgeToken = "test-edge-token"
	signupLimiter = limiter
	verificationLimiter = newSignupRateLimiter(10, 10, time.Minute, 32)
	signupDeliveries = newDeliveryTracker(32)
	tmpl = htmltemplate.Must(htmltemplate.ParseFiles("templates/welcome.html", "templates/enter.html"))
	t.Cleanup(func() {
		issuer, baseURL = oldIssuer, oldBaseURL
		zitadelPAT, trustedProxyHost, trustedEdgeToken = oldPAT, oldProxyHost, oldEdgeToken
		signupLimiter, verificationLimiter = oldLimiter, oldVerificationLimiter
		signupDeliveries, tmpl = oldDeliveries, oldTemplate
	})
}

func getSignupCSRF(t *testing.T) *http.Cookie {
	t.Helper()
	recorder := httptest.NewRecorder()
	handleEnter(recorder, httptest.NewRequest(http.MethodGet, "/enter?step=signup", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("GET /enter signup status = %d, want 200", recorder.Code)
	}
	return signupCSRFFromRecorder(t, recorder)
}

func signupCSRFFromRecorder(t *testing.T, recorder *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, cookie := range recorder.Result().Cookies() {
		if cookie.Name != csrfCookieName || cookie.Value == "" {
			continue
		}
		if !strings.Contains(recorder.Body.String(), `name="csrf_token" value="`+cookie.Value+`"`) {
			t.Fatal("signup form and CSRF cookie do not carry the same non-empty token")
		}
		if !strings.HasPrefix(cookie.Name, "__Host-") || !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != "/" || cookie.Domain != "" || cookie.MaxAge != int(csrfTTL.Seconds()) {
			t.Fatalf("CSRF cookie attributes = %#v", cookie)
		}
		return cookie
	}
	t.Fatal("signup response did not set a usable CSRF cookie")
	return nil
}

func postSignup(t *testing.T, cookie *http.Cookie, name, email, remoteAddr, forwardedFor string) *httptest.ResponseRecorder {
	t.Helper()
	form := url.Values{"name": {name}, "email": {email}, "csrf_token": {cookie.Value}}
	req := httptest.NewRequest(http.MethodPost, "/enter", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.RemoteAddr = remoteAddr
	if forwardedFor != "" {
		req.Header.Set("X-Forwarded-For", forwardedFor)
		req.Header.Set("X-Real-IP", forwardedFor)
	}
	req.AddCookie(cookie)
	recorder := httptest.NewRecorder()
	handleEnter(recorder, req)
	return recorder
}

func verificationRequest(t *testing.T, templateURL, userID string) *http.Request {
	t.Helper()
	parsedTemplate, err := texttemplate.New("ownership").Parse(templateURL)
	if err != nil {
		t.Fatal(err)
	}
	var rendered strings.Builder
	if err := parsedTemplate.Execute(&rendered, struct {
		UserID string
		Code   string
		OrgID  string
	}{UserID: userID, Code: "email-code", OrgID: "org-1"}); err != nil {
		t.Fatal(err)
	}
	link := rendered.String()
	parsed, err := url.Parse(link)
	if err != nil {
		t.Fatal(err)
	}
	return httptest.NewRequest(http.MethodGet, parsed.RequestURI(), nil)
}

func TestHandleEnterRequiresMatchingCSRF(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	form := url.Values{"name": {"Ada"}, "email": {"ada@example.com"}}
	req := httptest.NewRequest(http.MethodPost, "/enter", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	recorder := httptest.NewRecorder()
	handleEnter(recorder, req)
	if recorder.Code != http.StatusForbidden || !strings.Contains(recorder.Body.String(), "that form expired") {
		t.Fatalf("POST without CSRF = %d %s", recorder.Code, recorder.Body.String())
	}
	stub.mu.Lock()
	requests := len(stub.requests)
	stub.mu.Unlock()
	if requests != 0 {
		t.Fatalf("CSRF failure made %d provider calls, want 0", requests)
	}
	signupCSRFFromRecorder(t, recorder)
}

func TestHandleEnterRejectsFormParseErrorsBeforeSecurityAndProviderWork(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	limiter := newSignupRateLimiter(10, 10, time.Minute, 32)
	installEnterTestState(t, server.URL, limiter)
	tests := []struct {
		name   string
		body   string
		media  string
		status int
	}{
		{name: "malformed", body: "name=%zz", media: "application/x-www-form-urlencoded", status: http.StatusBadRequest},
		{name: "oversize", body: "name=" + strings.Repeat("x", enterFormMaxBytes), media: "application/x-www-form-urlencoded", status: http.StatusRequestEntityTooLarge},
		{name: "unsupported", body: strings.Repeat("x", enterFormMaxBytes*2), media: "multipart/form-data; boundary=ignored", status: http.StatusBadRequest},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/enter", strings.NewReader(test.body))
			req.Header.Set("Content-Type", test.media)
			recorder := httptest.NewRecorder()
			handleEnter(recorder, req)
			if recorder.Code != test.status {
				t.Fatalf("status = %d, want %d", recorder.Code, test.status)
			}
			signupCSRFFromRecorder(t, recorder)
		})
	}
	stub.mu.Lock()
	providerCalls := len(stub.requests)
	stub.mu.Unlock()
	limiter.mu.Lock()
	limiterKeys := len(limiter.entries)
	limiter.mu.Unlock()
	if providerCalls != 0 || limiterKeys != 0 {
		t.Fatalf("parse failures reached provider/limiter: provider=%d limiterKeys=%d", providerCalls, limiterKeys)
	}
}

func TestSignupClientIPTrustsOnlyResolvedTraefikPeer(t *testing.T) {
	oldEdgeToken := trustedEdgeToken
	trustedEdgeToken = "test-edge-token"
	t.Cleanup(func() { trustedEdgeToken = oldEdgeToken })
	resolve := func(_ context.Context, host string) ([]net.IPAddr, error) {
		if host != "traefik" {
			t.Fatalf("resolved host = %q", host)
		}
		return []net.IPAddr{{IP: net.ParseIP("172.20.0.5")}}, nil
	}
	request := func(peer, forwarded, realIP string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/enter", nil)
		req.RemoteAddr = peer + ":4321"
		req.Header.Set("X-Forwarded-For", forwarded)
		req.Header.Set("X-Real-IP", realIP)
		req.Header.Set("X-Is-Trusted", "yes")
		req.Header.Set("X-Inspr-Edge-Token", "test-edge-token")
		return req
	}
	first := signupClientIPWithResolver(request("172.20.0.5", "198.51.100.8", "198.51.100.8"), resolve)
	second := signupClientIPWithResolver(request("172.20.0.5", "203.0.113.9", "203.0.113.9"), resolve)
	if first == second {
		t.Fatalf("distinct callers behind authoritative Traefik collapsed to %q", first)
	}
	missingToken := request("172.20.0.5", "198.51.100.8", "198.51.100.8")
	missingToken.Header.Del("X-Inspr-Edge-Token")
	if got := signupClientIPWithResolver(missingToken, resolve); got != "172.20.0.5" {
		t.Fatalf("missing edge attestation trusted forwarded key %q", got)
	}
	badToken := request("172.20.0.5", "198.51.100.8", "198.51.100.8")
	badToken.Header.Set("X-Inspr-Edge-Token", "attacker-chosen")
	if got := signupClientIPWithResolver(badToken, resolve); got != "172.20.0.5" {
		t.Fatalf("mismatched edge attestation trusted forwarded key %q", got)
	}
	trustedEdgeToken = ""
	if got := signupClientIPWithResolver(request("172.20.0.5", "198.51.100.8", "198.51.100.8"), resolve); got != "172.20.0.5" {
		t.Fatalf("unconfigured edge attestation did not fail closed: %q", got)
	}
	trustedEdgeToken = "test-edge-token"
	if got := signupClientIPWithResolver(request("172.20.0.6", "198.51.100.8", "198.51.100.8"), resolve); got != "172.20.0.6" {
		t.Fatalf("unrelated private peer spoofed key %q", got)
	}
	if got := signupClientIPWithResolver(request("172.20.0.5", "192.0.2.44, 198.51.100.8", "198.51.100.8"), resolve); got != "172.20.0.5" {
		t.Fatalf("forwarded chain selected spoofable key %q", got)
	}
	failedResolve := func(context.Context, string) ([]net.IPAddr, error) { return nil, errors.New("dns unavailable") }
	if got := signupClientIPWithResolver(request("172.20.0.5", "198.51.100.8", "198.51.100.8"), failedResolve); got != "172.20.0.5" {
		t.Fatalf("DNS failure did not fail closed to peer: %q", got)
	}
}

func TestHandleEnterRateLimitsByIPAndEmail(t *testing.T) {
	t.Run("IP", func(t *testing.T) {
		stub := &zitadelStub{}
		server := httptest.NewServer(stub)
		defer server.Close()
		installEnterTestState(t, server.URL, newSignupRateLimiter(1, 10, time.Minute, 32))
		first := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "10.0.0.2:1234", "")
		second := postSignup(t, getSignupCSRF(t), "Grace", "grace@example.com", "10.0.0.2:4321", "")
		if first.Code != http.StatusOK || second.Code != http.StatusTooManyRequests || second.Header().Get("Retry-After") == "" {
			t.Fatalf("IP statuses = %d/%d retry=%q", first.Code, second.Code, second.Header().Get("Retry-After"))
		}
	})
	t.Run("email", func(t *testing.T) {
		stub := &zitadelStub{}
		server := httptest.NewServer(stub)
		defer server.Close()
		installEnterTestState(t, server.URL, newSignupRateLimiter(10, 1, time.Minute, 32))
		first := postSignup(t, getSignupCSRF(t), "Ada", "ADA@example.com", "10.0.0.2:1234", "")
		second := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "10.0.0.3:4321", "")
		if first.Code != http.StatusOK || second.Code != http.StatusTooManyRequests {
			t.Fatalf("email statuses = %d/%d", first.Code, second.Code)
		}
	})
}

func TestSignupRateLimiterConcurrentLimit(t *testing.T) {
	limiter := newSignupRateLimiter(7, 7, time.Minute, 32)
	start := make(chan struct{})
	var successes atomic.Int64
	var wg sync.WaitGroup
	for i := 0; i < 64; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			if limiter.Allow("192.0.2.1", "ada@example.com", time.Unix(1, 0)) {
				successes.Add(1)
			}
		}()
	}
	close(start)
	wg.Wait()
	if got := successes.Load(); got != 7 {
		t.Fatalf("concurrent successes = %d, want 7", got)
	}
}

func TestHandleEnterUsesUnverifiedV2OwnershipContract(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	recorder := postSignup(t, getSignupCSRF(t), "Ada Lovelace", "ada@example.com", "192.0.2.2:1234", "")
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "the next step") || strings.Contains(recorder.Body.String(), "we just sent") {
		t.Fatalf("successful signup = %d %s", recorder.Code, recorder.Body.String())
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if len(stub.requests) != 1 || stub.requests[0].method != http.MethodPost || stub.requests[0].path != "/v2beta/users/human" {
		t.Fatalf("provider calls = %#v", stub.requests)
	}
	body := stub.requests[0].body
	emailObject, _ := body["email"].(map[string]any)
	if _, present := emailObject["isVerified"]; present {
		t.Fatalf("creation marked verification directly: %#v", emailObject)
	}
	sendCode, _ := emailObject["sendCode"].(map[string]any)
	if emailObject["email"] != "ada@example.com" || sendCode["urlTemplate"] == "" {
		t.Fatalf("v2 email send-code shape = %#v", emailObject)
	}
	profile, _ := body["profile"].(map[string]any)
	if profile["givenName"] != "Ada" || profile["familyName"] != "Lovelace" || profile["displayName"] != "Ada Lovelace" || profile["preferredLanguage"] != "en" {
		t.Fatalf("v2 profile shape = %#v", profile)
	}
	if _, legacy := body["requestPasswordlessRegistration"]; legacy {
		t.Fatalf("legacy import shape remains: %#v", body)
	}
	userID, _ := body["userId"].(string)
	parsed, err := url.Parse(stub.lastURLTemplate)
	if err != nil {
		t.Fatal(err)
	}
	if len(stub.lastURLTemplate) > 200 || parsed.Path != "/enter/verify" || parsed.Query().Get("userID") != "{{.UserID}}" || !validOwnershipState(userID, parsed.Query().Get("expires"), parsed.Query().Get("state"), time.Now()) {
		t.Fatalf("ownership URL template is invalid: %q", stub.lastURLTemplate)
	}
}

func TestHandleEnterLostCreateResponseRecoversByCheckedResend(t *testing.T) {
	const providerCanary = "TOP-SECRET-PROVIDER-BODY ada@example.com signup-user"
	stub := &zitadelStub{failFirstCreateCommit: true, errorBody: providerCanary}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	var logs bytes.Buffer
	oldLogOutput := log.Writer()
	log.SetOutput(&logs)
	t.Cleanup(func() { log.SetOutput(oldLogOutput) })
	first := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", "")
	second := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:4321", "")
	if first.Code != http.StatusBadGateway || second.Code != http.StatusOK || !strings.Contains(second.Body.String(), "the next step") {
		t.Fatalf("lost-response recovery statuses = %d/%d", first.Code, second.Code)
	}
	stub.mu.Lock()
	createCalls, resendCalls := stub.createCalls, stub.resendCalls
	stub.mu.Unlock()
	if createCalls != 2 || resendCalls != 1 {
		t.Fatalf("recovery calls create=%d resend=%d, want 2/1", createCalls, resendCalls)
	}
	if strings.Contains(first.Body.String(), providerCanary) || strings.Contains(logs.String(), providerCanary) || strings.Contains(logs.String(), "ada@example.com") {
		t.Fatalf("provider details leaked: body=%q logs=%q", first.Body.String(), logs.String())
	}
	if !strings.Contains(logs.String(), "stage=create status=502") {
		t.Fatalf("redacted log lost stage/status: %q", logs.String())
	}
}

func TestHandleEnterVerifiedConflictRecoversWithoutEnumerationOrMailBurst(t *testing.T) {
	userID := signupUserID("ada@example.com")
	stub := &zitadelStub{users: map[string]*stubUser{
		userID: {email: "ada@example.com", verified: true},
	}}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))

	first := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", "")
	second := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:4321", "")
	for i, recorder := range []*httptest.ResponseRecorder{first, second} {
		body := recorder.Body.String()
		if recorder.Code != http.StatusOK || !strings.Contains(body, "the next step") || strings.Contains(body, "verified") || strings.Contains(body, "already") {
			t.Fatalf("recovery response %d leaks state or is unusable: %d %s", i, recorder.Code, body)
		}
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if stub.createCalls != 2 || stub.passkeyCalls != 1 {
		t.Fatalf("verified recovery calls create=%d passkey=%d, want 2/1 idempotent send", stub.createCalls, stub.passkeyCalls)
	}
}

func TestExpiredOwnershipLinkRecoversThroughGenericSignup(t *testing.T) {
	userID := signupUserID("ada@example.com")
	stub := &zitadelStub{users: map[string]*stubUser{
		userID: {email: "ada@example.com", verified: true},
	}}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))

	expired := ownershipURLTemplate(userID, time.Now().Add(-time.Minute))
	expiredRecorder := httptest.NewRecorder()
	handleEnterVerify(expiredRecorder, verificationRequest(t, expired, userID))
	if expiredRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expired link status = %d, want 400", expiredRecorder.Code)
	}

	recovery := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", "")
	if recovery.Code != http.StatusOK || !strings.Contains(recovery.Body.String(), "the next step") {
		t.Fatalf("expired-link recovery = %d %s", recovery.Code, recovery.Body.String())
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if stub.verifyCalls != 0 || stub.passkeyCalls != 1 {
		t.Fatalf("expired link/provider recovery calls verify=%d passkey=%d", stub.verifyCalls, stub.passkeyCalls)
	}
}

func TestEnterVerificationProvesOwnershipBeforePasskey(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	if got := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", ""); got.Code != http.StatusOK {
		t.Fatalf("signup status = %d", got.Code)
	}
	stub.mu.Lock()
	userID, link := signupUserID("ada@example.com"), stub.lastURLTemplate
	if stub.users[userID].verified {
		t.Fatal("email was verified at creation")
	}
	stub.mu.Unlock()
	recorder := httptest.NewRecorder()
	handleEnterVerify(recorder, verificationRequest(t, link, userID))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "address is verified") {
		t.Fatalf("verification status = %d body=%s", recorder.Code, recorder.Body.String())
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if !stub.users[userID].verified || stub.verifyCalls != 1 || stub.passkeyCalls != 1 {
		t.Fatalf("ownership order state verified=%t verify=%d passkey=%d", stub.users[userID].verified, stub.verifyCalls, stub.passkeyCalls)
	}
	last := stub.requests[len(stub.requests)-1]
	if last.path != "/management/v1/users/"+userID+"/passwordless/_send_link" || len(last.body) != 0 {
		t.Fatalf("passkey send request shape = %#v", last)
	}
}

func TestEnterVerificationReplayIsIdempotent(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	_ = postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", "")
	stub.mu.Lock()
	userID, link := signupUserID("ada@example.com"), stub.lastURLTemplate
	stub.mu.Unlock()

	for i := 0; i < 20; i++ {
		recorder := httptest.NewRecorder()
		handleEnterVerify(recorder, verificationRequest(t, link, userID))
		if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "address is verified") {
			t.Fatalf("replay %d = %d", i, recorder.Code)
		}
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if stub.verifyCalls != 1 || stub.passkeyCalls != 1 {
		t.Fatalf("20 replays emitted provider calls verify=%d passkey=%d, want 1/1", stub.verifyCalls, stub.passkeyCalls)
	}
}

func TestEnterVerificationDistinctLinksAreRateLimitedPerUser(t *testing.T) {
	userID := signupUserID("ada@example.com")
	stub := &zitadelStub{users: map[string]*stubUser{
		userID: {email: "ada@example.com", verified: true},
	}}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	verificationLimiter = newSignupRateLimiter(10, 2, time.Minute, 32)

	statuses := make([]int, 0, 3)
	for i := 1; i <= 3; i++ {
		link := ownershipURLTemplate(userID, time.Now().Add(time.Duration(i)*time.Hour))
		recorder := httptest.NewRecorder()
		handleEnterVerify(recorder, verificationRequest(t, link, userID))
		statuses = append(statuses, recorder.Code)
	}
	if statuses[0] != http.StatusOK || statuses[1] != http.StatusOK || statuses[2] != http.StatusTooManyRequests {
		t.Fatalf("distinct-link statuses = %v, want [200 200 429]", statuses)
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if stub.passkeyCalls != 2 {
		t.Fatalf("distinct links emitted %d passkey mails, want 2", stub.passkeyCalls)
	}
}

func TestEnterVerificationRetryRecoversAfterPasskeyFailure(t *testing.T) {
	const providerCanary = "TOP-SECRET-PASSKEY-BODY ada@example.com passkey-code"
	stub := &zitadelStub{passkeyFailures: 1, errorBody: providerCanary}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	var logs bytes.Buffer
	oldLogOutput := log.Writer()
	log.SetOutput(&logs)
	t.Cleanup(func() { log.SetOutput(oldLogOutput) })
	_ = postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", "")
	stub.mu.Lock()
	userID, link := signupUserID("ada@example.com"), stub.lastURLTemplate
	stub.mu.Unlock()
	first := httptest.NewRecorder()
	handleEnterVerify(first, verificationRequest(t, link, userID))
	second := httptest.NewRecorder()
	handleEnterVerify(second, verificationRequest(t, link, userID))
	if first.Code != http.StatusBadGateway || second.Code != http.StatusOK || !strings.Contains(second.Body.String(), "address is verified") {
		t.Fatalf("partial-success retry = %d/%d, want 502/200", first.Code, second.Code)
	}
	if strings.Contains(first.Body.String(), providerCanary) || strings.Contains(logs.String(), providerCanary) || strings.Contains(logs.String(), "ada@example.com") || !strings.Contains(logs.String(), "stage=passkey status=502") {
		t.Fatalf("passkey failure was not safely diagnosed: body=%q logs=%q", first.Body.String(), logs.String())
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if stub.verifyCalls != 2 || stub.passkeyCalls != 2 {
		t.Fatalf("retry calls verify=%d passkey=%d, want 2/2", stub.verifyCalls, stub.passkeyCalls)
	}
}

func TestEnterVerificationRejectsForgedStateBeforeProvider(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	req := httptest.NewRequest(http.MethodGet, "/enter/verify?userID=victim&code=email-code&expires=9999999999&state=forged", nil)
	recorder := httptest.NewRecorder()
	handleEnterVerify(recorder, req)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("forged state status = %d", recorder.Code)
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if len(stub.requests) != 0 {
		t.Fatalf("forged state made %d provider calls", len(stub.requests))
	}
}

func TestSignupRateLimiterBoundsMemory(t *testing.T) {
	limiter := newSignupRateLimiter(100, 100, time.Hour, 4)
	now := time.Now()
	denied := 0
	for i := 0; i < 20; i++ {
		if !limiter.Allow(fmt.Sprintf("192.0.2.%d", i), fmt.Sprintf("person%d@example.com", i), now.Add(time.Duration(i)*time.Second)) {
			denied++
		}
		if got := len(limiter.entries); got > limiter.maxKeys {
			t.Fatalf("limiter retained %d keys, cap is %d", got, limiter.maxKeys)
		}
	}
	if denied == 0 {
		t.Fatal("full limiter evicted live entries instead of failing closed")
	}
}

func TestDeliveryTrackerSerializesConcurrentReplayAndFailsClosedAtCapacity(t *testing.T) {
	tracker := newDeliveryTracker(2)
	now := time.Now()
	expires := now.Add(time.Hour)
	var started atomic.Int32
	var already atomic.Int32
	var workers sync.WaitGroup
	for range 64 {
		workers.Add(1)
		go func() {
			defer workers.Done()
			switch tracker.Start("same-signed-link", now, expires) {
			case deliveryStarted:
				started.Add(1)
			case deliveryAlready:
				already.Add(1)
			default:
				t.Error("same-key replay unexpectedly exhausted tracker capacity")
			}
		}()
	}
	workers.Wait()
	if started.Load() != 1 || already.Load() != 63 {
		t.Fatalf("concurrent replay decisions started=%d already=%d", started.Load(), already.Load())
	}

	tracker.Finish("same-signed-link", false)
	if got := tracker.Start("same-signed-link", now, expires); got != deliveryStarted {
		t.Fatalf("failed delivery did not release retry reservation: %v", got)
	}
	tracker.Finish("same-signed-link", true)
	if got := tracker.Start("second-link", now, expires); got != deliveryStarted {
		t.Fatalf("second live delivery = %v, want started", got)
	}
	if got := tracker.Start("third-link", now, expires); got != deliveryFull {
		t.Fatalf("full tracker decision = %v, want fail-closed full", got)
	}
}
