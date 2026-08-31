package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

type zitadelStub struct {
	mu              sync.Mutex
	createCalls     int
	sendCalls       int
	emailVerified   bool
	verifiedPresent bool
	sendStatus      int
	errorBody       string
}

func (s *zitadelStub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch {
	case r.URL.Path == "/management/v1/users/human/_import":
		s.createCalls++
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if email, ok := body["email"].(map[string]any); ok {
			value, present := email["isEmailVerified"]
			s.verifiedPresent = present
			s.emailVerified, _ = value.(bool)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"userId":"test-user"}`))

	case strings.Contains(r.URL.Path, "/passwordless/_send_link"),
		strings.Contains(r.URL.Path, "/_send_passwordless_registration"):
		s.sendCalls++
		if s.sendStatus != 0 && s.sendStatus != http.StatusOK {
			http.Error(w, s.errorBody, s.sendStatus)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{}`))

	default:
		http.NotFound(w, r)
	}
}

func (s *zitadelStub) counts() (int, int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.createCalls, s.sendCalls
}

func installEnterTestState(t *testing.T, serverURL string, limiter *signupRateLimiter) {
	t.Helper()
	oldIssuer := issuer
	oldPAT := zitadelPAT
	oldLimiter := signupLimiter
	oldTemplate := tmpl
	issuer = serverURL
	zitadelPAT = "test-pat"
	signupLimiter = limiter
	tmpl = template.Must(template.ParseFiles("templates/welcome.html", "templates/enter.html"))
	t.Cleanup(func() {
		issuer = oldIssuer
		zitadelPAT = oldPAT
		signupLimiter = oldLimiter
		tmpl = oldTemplate
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
		if cookie.Name != csrfCookieName {
			continue
		}
		if cookie.Value == "" {
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
	t.Fatal("GET /enter signup did not set a CSRF cookie")
	return nil
}

func postSignup(t *testing.T, cookie *http.Cookie, name, email, remoteAddr, forwardedFor string) *httptest.ResponseRecorder {
	t.Helper()
	form := url.Values{
		"name":       {name},
		"email":      {email},
		"csrf_token": {cookie.Value},
	}
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

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("POST without CSRF status = %d, want 403", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "that form expired") {
		t.Fatalf("POST without CSRF did not render an actionable error: %s", recorder.Body.String())
	}
	if creates, _ := stub.counts(); creates != 0 {
		t.Fatalf("POST without CSRF made %d create calls, want 0", creates)
	}
	fresh := signupCSRFFromRecorder(t, recorder)
	if fresh.Value == "" {
		t.Fatal("CSRF failure retry did not receive a usable fresh token")
	}
}

func TestSignupClientIPRequiresDeployedProxyHeaderPair(t *testing.T) {
	request := func(forwarded, realIP string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/enter", nil)
		req.RemoteAddr = "172.20.0.5:4321"
		req.Header.Set("X-Forwarded-For", forwarded)
		req.Header.Set("X-Real-IP", realIP)
		return req
	}

	if first, second := signupClientIP(request("198.51.100.8", "198.51.100.8")), signupClientIP(request("203.0.113.9", "203.0.113.9")); first == second {
		t.Fatalf("distinct callers behind Traefik collapsed to one key: %q", first)
	}
	if got := signupClientIP(request("192.0.2.44, 198.51.100.8", "198.51.100.8")); got != "172.20.0.5" {
		t.Fatalf("prefixed X-Forwarded-For selected spoofable key %q, want direct peer", got)
	}
	if got := signupClientIP(request("198.51.100.8", "203.0.113.9")); got != "172.20.0.5" {
		t.Fatalf("conflicting forwarded headers selected spoofable key %q, want direct peer", got)
	}
}

func TestHandleEnterRateLimitsByIPAndEmail(t *testing.T) {
	t.Run("IP", func(t *testing.T) {
		stub := &zitadelStub{}
		server := httptest.NewServer(stub)
		defer server.Close()
		installEnterTestState(t, server.URL, newSignupRateLimiter(1, 10, time.Minute, 32))

		first := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "10.0.0.2:1234", "198.51.100.8")
		if first.Code != http.StatusOK {
			t.Fatalf("first signup status = %d, want 200", first.Code)
		}
		second := postSignup(t, getSignupCSRF(t), "Grace", "grace@example.com", "10.0.0.2:4321", "198.51.100.8")
		if second.Code != http.StatusTooManyRequests || second.Header().Get("Retry-After") == "" {
			t.Fatalf("second same-IP signup = %d Retry-After=%q, want 429 with retry guidance", second.Code, second.Header().Get("Retry-After"))
		}
		if creates, _ := stub.counts(); creates != 1 {
			t.Fatalf("same-IP limit allowed %d create calls, want 1", creates)
		}
	})

	t.Run("email", func(t *testing.T) {
		stub := &zitadelStub{}
		server := httptest.NewServer(stub)
		defer server.Close()
		installEnterTestState(t, server.URL, newSignupRateLimiter(10, 1, time.Minute, 32))

		first := postSignup(t, getSignupCSRF(t), "Ada", "ADA@example.com", "10.0.0.2:1234", "198.51.100.8")
		if first.Code != http.StatusOK {
			t.Fatalf("first signup status = %d, want 200", first.Code)
		}
		second := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "10.0.0.2:4321", "203.0.113.9")
		if second.Code != http.StatusTooManyRequests {
			t.Fatalf("second same-email signup = %d, want 429", second.Code)
		}
		if creates, _ := stub.counts(); creates != 1 {
			t.Fatalf("same-email limit allowed %d create calls, want 1", creates)
		}
	})
}

func TestHandleEnterCreatesUnverifiedEmail(t *testing.T) {
	stub := &zitadelStub{}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))

	recorder := postSignup(t, getSignupCSRF(t), "Ada Lovelace", "ada@example.com", "192.0.2.2:1234", "")
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "we just sent") {
		t.Fatalf("successful signup status/body = %d %s", recorder.Code, recorder.Body.String())
	}
	stub.mu.Lock()
	defer stub.mu.Unlock()
	if !stub.verifiedPresent || stub.emailVerified {
		t.Fatalf("create email verification = present:%t value:%t, want explicit false", stub.verifiedPresent, stub.emailVerified)
	}
}

func TestHandleEnterSurfacesSendFailure(t *testing.T) {
	const providerCanary = "TOP-SECRET-PROVIDER-BODY ada@example.com test-user"
	stub := &zitadelStub{sendStatus: http.StatusNotFound, errorBody: providerCanary}
	server := httptest.NewServer(stub)
	defer server.Close()
	installEnterTestState(t, server.URL, newSignupRateLimiter(10, 10, time.Minute, 32))
	var logs bytes.Buffer
	oldLogOutput := log.Writer()
	log.SetOutput(&logs)
	t.Cleanup(func() { log.SetOutput(oldLogOutput) })

	recorder := postSignup(t, getSignupCSRF(t), "Ada", "ada@example.com", "192.0.2.2:1234", "")
	if recorder.Code != http.StatusBadGateway {
		t.Fatalf("send failure status = %d, want 502", recorder.Code)
	}
	body := recorder.Body.String()
	if !strings.Contains(body, "something didn") || strings.Contains(body, `<html lang="en" data-state="inbox">`) {
		t.Fatalf("send failure rendered a dishonest state: %s", body)
	}
	if creates, sends := stub.counts(); creates != 1 || sends != 2 {
		t.Fatalf("send failure calls = create:%d send:%d, want 1/2 fallbacks", creates, sends)
	}
	if strings.Contains(body, providerCanary) || strings.Contains(logs.String(), providerCanary) || strings.Contains(logs.String(), "ada@example.com") || strings.Contains(logs.String(), "test-user") {
		t.Fatalf("provider response detail leaked in response or logs: response=%q logs=%q", body, logs.String())
	}
	if !strings.Contains(logs.String(), "stage=send status=404") {
		t.Fatalf("redacted log lost operator stage/status: %q", logs.String())
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
