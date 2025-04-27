package integrations

import (
	"context"
	"github.com/databricks/databricks-sql-go/auth"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
	"net/http"
	"sync"
)

type oauth2ClientCredentials struct {
	clientID     string
	clientSecret string
	tokenUrl     string
	scopes       []string
	tokenSource  oauth2.TokenSource
	mx           sync.Mutex
}

func (c *oauth2ClientCredentials) Authenticate(r *http.Request) error {
	c.mx.Lock()
	defer c.mx.Unlock()

	if c.tokenSource == nil {
		config := clientcredentials.Config{
			ClientID:     c.clientID,
			ClientSecret: c.clientSecret,
			TokenURL:     c.tokenUrl,
			Scopes:       c.scopes,
		}
		c.tokenSource = config.TokenSource(context.Background())
	}

	token, err := c.tokenSource.Token()

	if err != nil {
		log.DefaultLogger.Error("token fetching failed", "err", err)
		return err
	}

	log.DefaultLogger.Debug("token fetched successfully")
	token.SetAuthHeader(r)

	return nil

}

func NewOauth2ClientCredentials(clientID, clientSecret, tokenUrl string, scopes []string) auth.Authenticator {
	return &oauth2ClientCredentials{
		clientID:     clientID,
		clientSecret: clientSecret,
		tokenUrl:     tokenUrl,
		scopes:       scopes,
		tokenSource:  nil,
		mx:           sync.Mutex{},
	}
}
