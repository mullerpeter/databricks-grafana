package integrations

import (
	"fmt"
	"net/http"
	"sync"
)

type TokenStorage struct {
	mu    sync.RWMutex
	token string
}

func NewTokenStorage(initialToken string) *TokenStorage {
	return &TokenStorage{token: initialToken}
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

func NewOAuthPassThroughAuthenticator(ts *TokenStorage) *OAuthPassThroughAuthenticator {
	return &OAuthPassThroughAuthenticator{tokenStorage: ts}
}

func (a *OAuthPassThroughAuthenticator) Authenticate(r *http.Request) error {
	if a.tokenStorage.Get() == "" {
		return fmt.Errorf("OAuth pass-through token is empty")
	}
	r.Header.Set("Authorization", a.tokenStorage.Get())
	return nil
}
