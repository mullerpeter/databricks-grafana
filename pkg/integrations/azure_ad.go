package integrations

import (
	"github.com/databricks/databricks-sql-go/auth"
	"github.com/grafana/grafana-azure-sdk-go/azsettings"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"net/http"
)

type azureAdCredentials struct {
	azuresettings *azsettings.AzureSettings
}

func (c *azureAdCredentials) Authenticate(r *http.Request) error {

	log.DefaultLogger.Info("AzureSetting", "azuresettings", c.azuresettings)
	ctx := r.Context()
	log.DefaultLogger.Info("Auth Token", "token", ctx.Value("token"))
	log.DefaultLogger.Info("Auth IDToken", "idtoken", ctx.Value("idToken"))

	return nil

}

func NewAzureADCredentials(azuresettings *azsettings.AzureSettings) auth.Authenticator {
	return &azureAdCredentials{
		azuresettings: azuresettings,
	}
}
