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
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.token = newToken
}

type Authenticator struct {
	tokenStorage *TokenStorage
}

func NewAuthenticator(ts *TokenStorage) *Authenticator {
	return &Authenticator{tokenStorage: ts}
}

func (a *Authenticator) Authenticate(r *http.Request) error {
	if a.tokenStorage.Get() == "" {
		return fmt.Errorf("Empty Token Pass Trough")
	}
	r.Header.Set("Authorization", a.tokenStorage.Get())
	return nil
}
