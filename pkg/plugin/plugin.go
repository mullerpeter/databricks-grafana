package plugin

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	dbsql "github.com/databricks/databricks-sql-go"
	"github.com/databricks/databricks-sql-go/auth"
	"github.com/databricks/databricks-sql-go/auth/oauth/m2m"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/mullerpeter/databricks-grafana/pkg/integrations"
	"strconv"
	"strings"
	"time"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler, backend.StreamHandler interfaces. Plugin should not
// implement all these interfaces - only those which are required for a particular task.
// For example if plugin does not need streaming functionality then you are free to remove
// methods that implement backend.StreamHandler. Implementing instancemgmt.InstanceDisposer
// is useful to clean up resources used by previous datasource instance when a new datasource
// instance created upon datasource settings changed.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
	_ backend.CallResourceHandler   = (*Datasource)(nil)
)

type DatasourceSettings struct {
	Path                   string `json:"path"`
	Hostname               string `json:"hostname"`
	Port                   string `json:"port"`
	AuthenticationMethod   string `json:"authenticationMethod"`
	ClientId               string `json:"clientId"`
	ExternalCredentialsUrl string `json:"externalCredentialsUrl"`
	OAuthScopes            string `json:"oauthScopes"`
}

type ConnectionSettingsRawJson struct {
	MaxOpenConns     string `json:"maxOpenConns"`
	MaxIdleConns     string `json:"maxIdleConns"`
	ConnMaxLifetime  string `json:"connMaxLifetime"`
	ConnMaxIdleTime  string `json:"connMaxIdleTime"`
	Retries          string `json:"retries"`
	RetryBackoff     string `json:"retryBackoff"`
	MaxRetryDuration string `json:"maxRetryDuration"`
	Timeout          string `json:"timeout"`
	MaxRows          string `json:"maxRows"`
}

type ConnectionSettings struct {
	MaxOpenConns     int
	MaxIdleConns     int
	ConnMaxLifetime  time.Duration
	ConnMaxIdleTime  time.Duration
	Retries          int
	RetryBackoff     time.Duration
	MaxRetryDuration time.Duration
	Timeout          time.Duration
	MaxRows          int
}

// validateField checks if a field is empty and returns an error if it is.
func validateConnectionSetting(field, fieldName string) error {
	if field == "" {
		log.DefaultLogger.Info(fmt.Sprintf("Connection settings missing required field %s", fieldName), "err", nil)
		return fmt.Errorf("connection settings missing required field %s", strings.ToLower(fieldName))
	}
	return nil
}

// NewSampleDatasource creates a new datasource instance.
func NewSampleDatasource(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	datasourceSettings := new(DatasourceSettings)
	err := json.Unmarshal(settings.JSONData, datasourceSettings)
	if err != nil {
		log.DefaultLogger.Info("Setting Parse Error", "err", err)
		return nil, err
	}

	connectionSettings := parseConnectionSettings(settings.JSONData)
	port := 443
	if datasourceSettings.Port != "" {
		portInt, err := strconv.Atoi(datasourceSettings.Port)
		if err != nil {
			log.DefaultLogger.Info("Port Parse Error", "err", err)
			return nil, err
		}
		port = portInt
	}

	if err := validateConnectionSetting(datasourceSettings.Hostname, "Hostname"); err != nil {
		return nil, err
	}

	if err := validateConnectionSetting(datasourceSettings.Path, "Path"); err != nil {
		return nil, err
	}

	switch datasourceSettings.AuthenticationMethod {
	case "m2m", "oauth2_client_credentials", "azure_entra_pass_thru", "oauth2_pass_through":
		var authenticator auth.Authenticator

		switch datasourceSettings.AuthenticationMethod {
		case "oauth2_client_credentials":

			if err := validateConnectionSetting(datasourceSettings.ExternalCredentialsUrl, "OAuth Credentials URL"); err != nil {
				return nil, err
			}

			if err := validateConnectionSetting(datasourceSettings.ClientId, "Client Id"); err != nil {
				return nil, err
			}

			if err := validateConnectionSetting(settings.DecryptedSecureJSONData["clientSecret"], "Client Secret"); err != nil {
				return nil, err
			}

			authenticator = integrations.NewOauth2ClientCredentials(
				datasourceSettings.ClientId,
				settings.DecryptedSecureJSONData["clientSecret"],
				datasourceSettings.ExternalCredentialsUrl,
				strings.Split(datasourceSettings.OAuthScopes, ","),
			)
		case "m2m":
			if err := validateConnectionSetting(datasourceSettings.ClientId, "Client Id"); err != nil {
				return nil, err
			}
			if err := validateConnectionSetting(settings.DecryptedSecureJSONData["clientSecret"], "Client Secret"); err != nil {
				return nil, err
			}
			authenticator = m2m.NewAuthenticatorWithScopes(
				datasourceSettings.ClientId,
				settings.DecryptedSecureJSONData["clientSecret"],
				datasourceSettings.Hostname,
				[]string{},
			)
		case "oauth2_pass_through", "azure_entra_pass_thru":
			authenticator = integrations.NewOAuthPassThroughAuthenticator()
		default:
			log.DefaultLogger.Info("unknown authentication method", "err", nil)
			return nil, fmt.Errorf("unknown authentication method: %s", datasourceSettings.AuthenticationMethod)
		}

		connector, err := dbsql.NewConnector(
			dbsql.WithServerHostname(datasourceSettings.Hostname),
			dbsql.WithHTTPPath(datasourceSettings.Path),
			dbsql.WithPort(port),
			dbsql.WithAuthenticator(authenticator),
			dbsql.WithTimeout(connectionSettings.Timeout),
			dbsql.WithMaxRows(connectionSettings.MaxRows),
			dbsql.WithRetries(connectionSettings.Retries, connectionSettings.RetryBackoff, connectionSettings.MaxRetryDuration),
		)
		if err != nil {
			log.DefaultLogger.Info("Connector Error", "err", err)
			return nil, err
		}

		log.DefaultLogger.Info("Init Databricks SQL DB")
		databricksDB := sql.OpenDB(connector)

		SetDatasourceSettings(databricksDB, connectionSettings)
		log.DefaultLogger.Info("Store Databricks SQL DB Connection")
		return &Datasource{
			connector:          connector,
			databricksDB:       databricksDB,
			connectionSettings: connectionSettings,
			authMethod:         datasourceSettings.AuthenticationMethod,
		}, nil
	case "dsn", "":
		connector, err := dbsql.NewConnector(
			dbsql.WithAccessToken(settings.DecryptedSecureJSONData["token"]),
			dbsql.WithServerHostname(datasourceSettings.Hostname),
			dbsql.WithPort(port),
			dbsql.WithHTTPPath(datasourceSettings.Path),
			dbsql.WithTimeout(connectionSettings.Timeout),
			dbsql.WithMaxRows(connectionSettings.MaxRows),
			dbsql.WithRetries(connectionSettings.Retries, connectionSettings.RetryBackoff, connectionSettings.MaxRetryDuration),
		)
		if err != nil {
			log.DefaultLogger.Info("Connector Error", "err", err)
			return nil, err
		}
		log.DefaultLogger.Info("Init Databricks SQL DB")
		databricksDB := sql.OpenDB(connector)

		if err := databricksDB.Ping(); err != nil {
			log.DefaultLogger.Info("Ping Error (Could not ping Databricks)", "err", err)
			return nil, err
		}

		SetDatasourceSettings(databricksDB, connectionSettings)
		log.DefaultLogger.Info("Store Databricks SQL DB Connection")
		return &Datasource{
			connector:          connector,
			databricksDB:       databricksDB,
			connectionSettings: connectionSettings,
			authMethod:         datasourceSettings.AuthenticationMethod,
		}, nil
	}

	log.DefaultLogger.Info("Invalid Authentication Method", "err", nil)
	return nil, fmt.Errorf("invalid authentication method: %s", datasourceSettings.AuthenticationMethod)
}

// parseInt is a helper function to parse an integer from a string
func parseInt(value string, defaultValue int) int {
	if value == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.DefaultLogger.Warn("Failed to parse integer", "value", value, "error", err)
		return defaultValue
	}
	return parsed
}

// parseConnectionSettings is a helper function to parse the connection settings from the JSON data
func parseConnectionSettings(settingsRawJson json.RawMessage) ConnectionSettings {
	connectionSettings := ConnectionSettings{
		MaxOpenConns:     0,
		MaxIdleConns:     2,
		ConnMaxLifetime:  6 * time.Hour,
		ConnMaxIdleTime:  6 * time.Hour,
		Retries:          4,
		RetryBackoff:     1 * time.Second,
		MaxRetryDuration: 30 * time.Second,
		Timeout:          0 * time.Second,
		MaxRows:          10000,
	}

	connectionSettingsJson := new(ConnectionSettingsRawJson)
	err := json.Unmarshal(settingsRawJson, connectionSettingsJson)
	if err != nil {
		log.DefaultLogger.Info("ConnectionSettings Parse Error", "err", err)
		return connectionSettings
	}

	connectionSettings.MaxOpenConns = parseInt(connectionSettingsJson.MaxOpenConns, 0)
	connectionSettings.MaxIdleConns = parseInt(connectionSettingsJson.MaxIdleConns, 2)
	connectionSettings.ConnMaxLifetime = time.Duration(parseInt(connectionSettingsJson.ConnMaxLifetime, 6*3600)) * time.Second
	connectionSettings.ConnMaxIdleTime = time.Duration(parseInt(connectionSettingsJson.ConnMaxIdleTime, 6*3600)) * time.Second

	return connectionSettings
}

// SetDatasourceSettings is a helper function to set the connection settings for the DB
func SetDatasourceSettings(db *sql.DB, connectionSettings ConnectionSettings) {
	db.SetConnMaxIdleTime(connectionSettings.ConnMaxIdleTime)
	db.SetConnMaxLifetime(connectionSettings.ConnMaxLifetime)
	db.SetMaxIdleConns(connectionSettings.MaxIdleConns)
	db.SetMaxOpenConns(connectionSettings.MaxOpenConns)
}

// RefreshDBConnection is a helper function which initializes a new DB connection
func (d *Datasource) RefreshDBConnection() error {
	d.databricksDB = sql.OpenDB(d.connector)

	if err := d.databricksDB.Ping(); err != nil {
		log.DefaultLogger.Info("Ping Error (Could not ping Databricks)", "err", err)
		return err
	}

	SetDatasourceSettings(d.databricksDB, d.connectionSettings)
	log.DefaultLogger.Info("Store Databricks SQL DB Connection")
	return nil
}

// ExecContext is a helper function to execute a query on the Databricks SQL DB without returning any rows and handling session expiration
func (d *Datasource) ExecContext(ctx context.Context, queryString string) error {
	_, err := d.databricksDB.ExecContext(ctx, queryString)
	if err != nil {
		if strings.Contains(err.Error(), "Invalid SessionHandle") {
			err = d.RefreshDBConnection()
			if err != nil {
				return err
			}
			return d.ExecContext(ctx, queryString)
		}
		return err
	}
	return nil
}

// QueryContext is a helper function to query the Databricks SQL DB returning the rows and handling session expiration
func (d *Datasource) QueryContext(ctx context.Context, queryString string) (*sql.Rows, error) {
	rows, err := d.databricksDB.QueryContext(ctx, queryString)
	if err != nil {
		if strings.Contains(err.Error(), "Invalid SessionHandle") {
			err = d.RefreshDBConnection()
			if err != nil {
				return nil, err
			}
			return d.QueryContext(ctx, queryString)
		}
		return nil, err
	}
	return rows, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	connector          driver.Connector
	databricksDB       *sql.DB
	connectionSettings ConnectionSettings
	authMethod         string
}

// CallResource handles resource calls sent from Grafana to the plugin.
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	ctx = AddPassTroughTokenToContext(ctx, req.GetHTTPHeader(backend.OAuthIdentityTokenHeaderName))
	return autocompletionQueries(ctx, req, sender, d)
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
	if d.databricksDB != nil {
		err := d.databricksDB.Close()
		if err != nil {
			log.DefaultLogger.Error("Error closing DB connection", "err", err)
		}
	}
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Info("QueryData called", "request", req)

	ctx = AddPassTroughTokenToContext(ctx, req.GetHTTPHeader(backend.OAuthIdentityTokenHeaderName))

	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type querySettings struct {
	ConvertLongToWide bool          `json:"convertLongToWide"`
	FillMode          data.FillMode `json:"fillMode"`
	FillValue         float64       `json:"fillValue"`
}

type queryModel struct {
	RawSql        string        `json:"rawSql"`
	QuerySettings querySettings `json:"querySettings"`
}

// query executes a query and returns the response.
func (d *Datasource) query(ctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	response := backend.DataResponse{}

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	log.DefaultLogger.Info("Query Full", "query", query)
	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		response.Error = err
		log.DefaultLogger.Info("Query Parsing Error", "err", err)
		return response
	}

	queryString := replaceMacros(qm.RawSql, query)

	// Check if the query string is empty
	if strings.TrimSpace(queryString) == "" {
		response.Error = fmt.Errorf("query string is empty")
		log.DefaultLogger.Info("Query String Empty", "err", response.Error)
		return response
	}

	// Check if multiple statements are present in the query
	// If so, split them and execute them individually
	if strings.Contains(queryString, ";") {
		// Split the query string into multiple statements
		queries := strings.Split(queryString, ";")
		// Check if the last statement is empty or just whitespace and newlines
		if strings.TrimSpace(queries[len(queries)-1]) == "" {
			// Remove the last statement
			queries = queries[:len(queries)-1]
		}
		// Check if there are stil multiple statements
		if len(queries) > 1 {
			// Execute all but the last statement without returning any data
			for _, query := range queries[:len(queries)-1] {
				err := d.ExecContext(ctx, query)
				if err != nil {
					response.Error = err
					log.DefaultLogger.Info("Error", "err", err)
					return response
				}
			}
			// Set the query string to the last statement
			queryString = queries[len(queries)-1]
		}
	}

	log.DefaultLogger.Info("Query", "query", queryString)

	frame := data.NewFrame("response")

	rows, err := d.QueryContext(ctx, queryString)
	if err != nil {
		response.Error = err
		log.DefaultLogger.Info("Error", "err", err)
		return response
	}

	frame, err = sqlutil.FrameFromRows(rows, -1)
	if err != nil {
		log.DefaultLogger.Info("FrameFromRows", "err", err)
		response.Error = err
		return response
	}

	if qm.QuerySettings.ConvertLongToWide {
		wideFrame, err := data.LongToWide(frame, &data.FillMissing{Value: qm.QuerySettings.FillValue, Mode: qm.QuerySettings.FillMode})
		if err != nil {
			log.DefaultLogger.Info("LongToWide conversion error", "err", err)
		} else {
			frame = wideFrame
		}
	}

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// AddPassTroughTokenToContext adds the pass through token to the context
func AddPassTroughTokenToContext(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, "pass_through_oauth_token", token)
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	log.DefaultLogger.Info("CheckHealth called", "request", req)
	ctx = AddPassTroughTokenToContext(ctx, req.GetHTTPHeader(backend.OAuthIdentityTokenHeaderName))

	rows, err := d.QueryContext(ctx, "SELECT 1")

	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("SQL Connection Failed: %s", err),
		}, nil
	}

	defer rows.Close()

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
