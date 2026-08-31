package main

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

func TestHandleLoginBindsStateAndNonce(t *testing.T) {
	previous := oauthCfg
	t.Cleanup(func() { oauthCfg = previous })
	oauthCfg = &oauth2.Config{
		ClientID:    "test-client",
		RedirectURL: "https://inspr.at/welcome",
		Endpoint: oauth2.Endpoint{
			AuthURL: "https://issuer.example/authorize",
		},
		Scopes: []string{oidc.ScopeOpenID},
	}

	recorder := httptest.NewRecorder()
	handleLogin(recorder, httptest.NewRequest(http.MethodGet, "https://inspr.at/login", nil))
	response := recorder.Result()
	t.Cleanup(func() { _ = response.Body.Close() })

	if response.StatusCode != http.StatusFound {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusFound)
	}
	cookies := make(map[string]*http.Cookie)
	for _, cookie := range response.Cookies() {
		cookies[cookie.Name] = cookie
	}
	state := requireTransientCookie(t, cookies, stateCookieName)
	nonce := requireTransientCookie(t, cookies, "inspr_nonce")
	if state.Value == nonce.Value {
		t.Fatal("state and nonce must be independently generated")
	}

	location, err := url.Parse(response.Header.Get("Location"))
	if err != nil {
		t.Fatalf("parse redirect: %v", err)
	}
	if got := location.Query().Get("state"); got != state.Value {
		t.Fatalf("redirect state does not match cookie")
	}
	if got := location.Query().Get("nonce"); got != nonce.Value {
		t.Fatalf("redirect nonce does not match cookie")
	}
}

func TestCompleteLoginRequiresBothOneTimeCookies(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "https://inspr.at/welcome?code=code&state=state", nil)
	request.AddCookie(&http.Cookie{Name: stateCookieName, Value: "state"})

	_, err := completeLoginWith(context.Background(), recorder, request, "code",
		func(context.Context, string) (*oauth2.Token, error) {
			t.Fatal("token exchange ran without a nonce cookie")
			return nil, nil
		},
		func(context.Context, string) (verifiedLoginToken, error) {
			t.Fatal("token verification ran without a nonce cookie")
			return verifiedLoginToken{}, nil
		},
	)
	if err == nil || !strings.Contains(err.Error(), "missing nonce cookie") {
		t.Fatalf("error = %v, want missing nonce cookie", err)
	}
	requireLoginAttemptCookiesCleared(t, recorder.Result())
}

func TestCompleteLoginRejectsNonceMismatchBeforeSession(t *testing.T) {
	for _, test := range []struct {
		name       string
		tokenNonce string
	}{
		{name: "different nonce", tokenNonce: "other-nonce"},
		{name: "missing nonce claim", tokenNonce: ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := callbackRequest("state", "expected-nonce")
			_, err := completeLoginWith(context.Background(), recorder, request, "code",
				stubTokenExchange(t),
				func(_ context.Context, raw string) (verifiedLoginToken, error) {
					if raw != "raw-id-token" {
						t.Fatalf("raw token = %q", raw)
					}
					return verifiedLoginToken{
						Nonce:  test.tokenNonce,
						Claims: loginClaims{Name: "Ada"},
					}, nil
				},
			)
			if err == nil || err.Error() != "nonce mismatch" {
				t.Fatalf("error = %v, want nonce mismatch", err)
			}
			cookies := responseCookies(recorder.Result())
			if cookies[sessionCookieName] != nil {
				t.Fatal("nonce mismatch minted a session cookie")
			}
			requireLoginAttemptCookiesCleared(t, recorder.Result())
		})
	}
}

func TestCompleteLoginAcceptsMatchingNonceAndConsumesAttempt(t *testing.T) {
	previousKey := cookieKey
	cookieKey = bytes.Repeat([]byte{0x42}, 32)
	t.Cleanup(func() { cookieKey = previousKey })

	recorder := httptest.NewRecorder()
	request := callbackRequest("state", "expected-nonce")
	name, err := completeLoginWith(context.Background(), recorder, request, "code",
		stubTokenExchange(t),
		func(_ context.Context, raw string) (verifiedLoginToken, error) {
			if raw != "raw-id-token" {
				t.Fatalf("raw token = %q", raw)
			}
			return verifiedLoginToken{
				Nonce:  "expected-nonce",
				Claims: loginClaims{Name: "Ada Lovelace", Sub: "subject"},
			}, nil
		},
	)
	if err != nil {
		t.Fatalf("complete login: %v", err)
	}
	if name != "Ada Lovelace" {
		t.Fatalf("name = %q", name)
	}
	cookies := responseCookies(recorder.Result())
	session := cookies[sessionCookieName]
	if session == nil || session.Value == "" || !session.HttpOnly || !session.Secure {
		t.Fatalf("session cookie = %#v", session)
	}
	readRequest := httptest.NewRequest(http.MethodGet, "https://inspr.at/welcome", nil)
	readRequest.AddCookie(session)
	payload, err := readSession(readRequest)
	if err != nil {
		t.Fatalf("read session: %v", err)
	}
	if payload.Name != "Ada Lovelace" {
		t.Fatalf("session name = %q", payload.Name)
	}
	requireLoginAttemptCookiesCleared(t, recorder.Result())
}

func TestCompleteLoginRejectsStateBeforeTokenExchange(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := callbackRequest("different-state", "nonce")
	_, err := completeLoginWith(context.Background(), recorder, request, "code",
		func(context.Context, string) (*oauth2.Token, error) {
			t.Fatal("token exchange ran after state mismatch")
			return nil, nil
		},
		func(context.Context, string) (verifiedLoginToken, error) {
			t.Fatal("token verification ran after state mismatch")
			return verifiedLoginToken{}, nil
		},
	)
	if err == nil || err.Error() != "state mismatch" {
		t.Fatalf("error = %v, want state mismatch", err)
	}
	requireLoginAttemptCookiesCleared(t, recorder.Result())
}

func callbackRequest(state, nonce string) *http.Request {
	request := httptest.NewRequest(http.MethodGet, "https://inspr.at/welcome?code=code&state=state", nil)
	request.AddCookie(&http.Cookie{Name: stateCookieName, Value: state})
	request.AddCookie(&http.Cookie{Name: nonceCookieName, Value: nonce})
	return request
}

func stubTokenExchange(t *testing.T) exchangeCodeFunc {
	t.Helper()
	return func(_ context.Context, code string) (*oauth2.Token, error) {
		if code != "code" {
			t.Fatalf("authorization code = %q", code)
		}
		return (&oauth2.Token{}).WithExtra(map[string]any{"id_token": "raw-id-token"}), nil
	}
}

func requireLoginAttemptCookiesCleared(t *testing.T, response *http.Response) {
	t.Helper()
	cookies := responseCookies(response)
	for _, name := range []string{stateCookieName, nonceCookieName} {
		cookie := cookies[name]
		if cookie == nil || cookie.Value != "" || cookie.MaxAge >= 0 || !cookie.HttpOnly || !cookie.Secure || cookie.Path != "/" {
			t.Fatalf("%s deletion cookie = %#v", name, cookie)
		}
	}
}

func responseCookies(response *http.Response) map[string]*http.Cookie {
	cookies := make(map[string]*http.Cookie)
	for _, cookie := range response.Cookies() {
		cookies[cookie.Name] = cookie
	}
	return cookies
}

func requireTransientCookie(t *testing.T, cookies map[string]*http.Cookie, name string) *http.Cookie {
	t.Helper()
	cookie := cookies[name]
	if cookie == nil {
		t.Fatalf("missing %s cookie", name)
	}
	if cookie.Value == "" {
		t.Fatalf("%s cookie is empty", name)
	}
	if cookie.Path != "/" || !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("%s cookie flags = path:%q httponly:%t secure:%t samesite:%d", name, cookie.Path, cookie.HttpOnly, cookie.Secure, cookie.SameSite)
	}
	if cookie.MaxAge != int(stateTTL.Seconds()) {
		t.Fatalf("%s max-age = %d, want %d", name, cookie.MaxAge, int(stateTTL.Seconds()))
	}
	return cookie
}
