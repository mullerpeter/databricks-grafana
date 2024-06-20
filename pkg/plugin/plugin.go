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
	"reflect"
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
}

// NewSampleDatasource creates a new datasource instance.
func NewSampleDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	datasourceSettings := new(DatasourceSettings)
	err := json.Unmarshal(settings.JSONData, datasourceSettings)
	if err != nil {
		log.DefaultLogger.Info("Setting Parse Error", "err", err)
		return nil, err
	}
	port := 443
	if datasourceSettings.Port != "" {
		portInt, err := strconv.Atoi(datasourceSettings.Port)
		if err != nil {
			log.DefaultLogger.Info("Port Parse Error", "err", err)
			return nil, err
		}
		port = portInt
	}

	if datasourceSettings.AuthenticationMethod == "m2m" || datasourceSettings.AuthenticationMethod == "oauth2_client_credentials" {
		var authenticator auth.Authenticator

		if datasourceSettings.AuthenticationMethod == "oauth2_client_credentials" {
			if datasourceSettings.ExternalCredentialsUrl == "" {
				log.DefaultLogger.Info("Authentication Method missing Credentials Url", "err", nil)
				return nil, fmt.Errorf("authentication Method missing Credentials Url")
			}
			authenticator = integrations.NewOauth2ClientCredentials(
				datasourceSettings.ClientId,
				settings.DecryptedSecureJSONData["clientSecret"],
				datasourceSettings.ExternalCredentialsUrl,
			)
		} else if datasourceSettings.AuthenticationMethod == "m2m" {
			authenticator = m2m.NewAuthenticatorWithScopes(
				datasourceSettings.ClientId,
				settings.DecryptedSecureJSONData["clientSecret"],
				datasourceSettings.Hostname,
				[]string{},
			)
		} else {
			log.DefaultLogger.Info("Authentication Method Parse Error", "err", nil)
			return nil, fmt.Errorf("authentication Method Parse Error")
		}

		connector, err := dbsql.NewConnector(
			dbsql.WithServerHostname(datasourceSettings.Hostname),
			dbsql.WithHTTPPath(datasourceSettings.Path),
			dbsql.WithPort(port),
			dbsql.WithAuthenticator(authenticator),
		)
		if err != nil {
			log.DefaultLogger.Info("Connector Error", "err", err)
			return nil, err
		} else {
			log.DefaultLogger.Info("Init Databricks SQL DB")
			databricksDB := sql.OpenDB(connector)

			if err := databricksDB.Ping(); err != nil {
				log.DefaultLogger.Info("Ping Error (Could not ping Databricks)", "err", err)
				return nil, err
			}

			databricksDB.SetConnMaxIdleTime(6 * time.Hour)
			log.DefaultLogger.Info("Store Databricks SQL DB Connection")
			return &Datasource{
				connector:    connector,
				databricksDB: databricksDB,
			}, nil
		}
	} else if datasourceSettings.AuthenticationMethod == "dsn" || datasourceSettings.AuthenticationMethod == "" {

		connector, err := dbsql.NewConnector(
			dbsql.WithAccessToken(settings.DecryptedSecureJSONData["token"]),
			dbsql.WithServerHostname(datasourceSettings.Hostname),
			dbsql.WithPort(port),
			dbsql.WithHTTPPath(datasourceSettings.Path),
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

		databricksDB.SetConnMaxIdleTime(6 * time.Hour)
		log.DefaultLogger.Info("Store Databricks SQL DB Connection")
		return &Datasource{
			connector:    connector,
			databricksDB: databricksDB,
		}, nil

	}

	return nil, fmt.Errorf("Invalid Connection Method")
}

func (d *Datasource) RefreshDBConnection() error {
	d.databricksDB = sql.OpenDB(d.connector)

	if err := d.databricksDB.Ping(); err != nil {
		log.DefaultLogger.Info("Ping Error (Could not ping Databricks)", "err", err)
		return err
	}

	d.databricksDB.SetConnMaxIdleTime(6 * time.Hour)
	log.DefaultLogger.Info("Store Databricks SQL DB Connection")
	return nil
}

func (d *Datasource) ExecuteQuery(queryString string) (*sql.Rows, error) {
	rows, err := d.databricksDB.Query(queryString)
	if err != nil {
		if strings.Contains(err.Error(), "Invalid SessionHandle") {
			err = d.RefreshDBConnection()
			if err != nil {
				return nil, err
			}
			rows, err = d.ExecuteQuery(queryString)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	return rows, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	connector    driver.Connector
	databricksDB *sql.DB
}

func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return autocompletionQueries(req, sender, d.databricksDB)
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Info("QueryData called", "request", req)

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
	RawSqlQuery   string        `json:"rawSqlQuery"`
	QuerySettings querySettings `json:"querySettings"`
}

func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	response := backend.DataResponse{}

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	log.DefaultLogger.Info("Query Ful", "query", query)
	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		response.Error = err
		log.DefaultLogger.Info("Query Parsing Error", "err", err)
		return response
	}

	queryString := replaceMacros(qm.RawSqlQuery, query)

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
				_, err := d.ExecuteQuery(query)
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

	rows, err := d.ExecuteQuery(queryString)
	if err != nil {
		response.Error = err
		log.DefaultLogger.Info("Error", "err", err)
		return response
	}

	dateConverter := sqlutil.Converter{
		Name:          "Databricks date to timestamp converter",
		InputScanType: reflect.TypeOf(sql.NullString{}),
		InputTypeName: "DATE",
		FrameConverter: sqlutil.FrameConverter{
			FieldType: data.FieldTypeNullableTime,
			ConverterFunc: func(n interface{}) (interface{}, error) {
				v := n.(*sql.NullString)

				if !v.Valid {
					return (*time.Time)(nil), nil
				}

				f := v.String
				date, error := time.Parse("2006-01-02", f)
				if error != nil {
					return (*time.Time)(nil), error
				}
				return &date, nil
			},
		},
	}

	frame, err = sqlutil.FrameFromRows(rows, -1, dateConverter)
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

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	log.DefaultLogger.Info("CheckHealth called", "request", req)

	rows, err := d.ExecuteQuery("SELECT 1")

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
