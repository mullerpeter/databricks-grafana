package integrations

import (
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"net/http"
	"sync"
)

// TokenStorage is a thread-safe storage for the OAuth pass-through token. Token Storage is needed as retries may not have the token in the context.
type TokenStorage struct {
	mu    sync.RWMutex
	token string
}

func (ts *TokenStorage) Get() string {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	return ts.token
}

func (ts *TokenStorage) Update(newToken string) {
	if newToken == "" {
		return
	}
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.token = newToken
}

type OAuthPassThroughAuthenticator struct {
	tokenStorage *TokenStorage
}

func NewOAuthPassThroughAuthenticator() *OAuthPassThroughAuthenticator {
	return &OAuthPassThroughAuthenticator{
		tokenStorage: &TokenStorage{},
	}
}

func (a *OAuthPassThroughAuthenticator) Authenticate(r *http.Request) error {
	tokenValue := r.Context().Value("pass_through_oauth_token")
	token, ok := tokenValue.(string)
	if !ok || token == "" {
		// If the token is not in the context, check the token storage as a fallback
		if a.tokenStorage.Get() != "" {
			token = a.tokenStorage.Get()
		} else {
			return fmt.Errorf("OAuth pass-through token is missing or not a string")
		}
	}

	if token != a.tokenStorage.Get() {
		a.tokenStorage.Update(token)
		log.DefaultLogger.Debug("Updating OAuth pass-through token")
	}

	r.Header.Set("Authorization", token)
	return nil
}
