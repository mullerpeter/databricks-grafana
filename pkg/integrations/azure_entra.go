package integrations

import (
	"fmt"
	"net/http"
	"sync"
)

// TokenStorage is a thread-safe wrapper for the token
type TokenStorage struct {
	mu    sync.RWMutex
	token string
}

// NewTokenStorage creates a new TokenStorage instance
func NewTokenStorage(initialToken string) *TokenStorage {
	return &TokenStorage{token: initialToken}
}

// Get retrieves the token
func (ts *TokenStorage) Get() string {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	return ts.token
}

// Update updates the token
func (ts *TokenStorage) Update(newToken string) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.token = newToken
}

// Authenticator uses TokenStorage to add auth headers
type Authenticator struct {
	tokenStorage *TokenStorage
}

// NewAuthenticator creates a new Authenticator with TokenStorage
func NewAuthenticator(ts *TokenStorage) *Authenticator {
	return &Authenticator{tokenStorage: ts}
}

func (a *Authenticator) Authenticate(r *http.Request) error {
	if a.tokenStorage.Get() == "" {
		return fmt.Errorf("Empty Token Pass Trough")
	}
	r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", a.tokenStorage.Get()))
	return nil
}
