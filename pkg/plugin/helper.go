package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/databricks/databricks-sql-go"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

type schemaRequestBody struct {
	Catalog string `json:"catalog"`
	Schema  string `json:"schema"`
	Table   string `json:"table"`
}

type columnsResponseBody struct {
	ColumnName string `json:"name"`
	ColumnType string `json:"type"`
}

type defaultsResponseBody struct {
	DefaultCatalog string `json:"defaultCatalog"`
	DefaultSchema  string `json:"defaultSchema"`
}

func sendJSONResponse(sender backend.CallResourceResponseSender, status int, data interface{}) error {
	jsonBody, err := json.Marshal(data)
	if err != nil {
		log.DefaultLogger.Error("CallResource Error, JSON marshaling failed", "err", err)
		return err
	}
	return sender.Send(&backend.CallResourceResponse{
		Status: status,
		Body:   jsonBody,
	})
}

func executeQuery(ctx context.Context, d *Datasource, query string, scanFunc func(*sql.Rows) error) error {
	rows, err := d.QueryContext(ctx, query)
	if err != nil {
		log.DefaultLogger.Error("CallResource Error", "err", err)
		return err
	}
	defer rows.Close()

	for rows.Next() {
		if err := scanFunc(rows); err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
	}

	return rows.Err()
}

func autocompletionQueries(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender, d *Datasource) error {
	path := req.Path
	log.DefaultLogger.Info("CallResource called", "path", path)
	var body schemaRequestBody
	err := json.Unmarshal(req.Body, &body)
	if err != nil {
		log.DefaultLogger.Error("CallResource Error", "err", err)
		return err
	}
	switch path {
	case "catalogs":
		catalogs := make([]string, 0)
		err = executeQuery(ctx, d, "SHOW CATALOGS", func(rows *sql.Rows) error {
			var catalog string
			if err := rows.Scan(&catalog); err != nil {
				return err
			}
			catalogs = append(catalogs, catalog)
			return nil
		})
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		return sendJSONResponse(sender, 200, catalogs)
	case "schemas":
		queryString := "SHOW SCHEMAS"
		if body.Catalog != "" {
			queryString = fmt.Sprintf("SHOW SCHEMAS IN %s", body.Catalog)
		}
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)

		schemas := make([]string, 0)
		err = executeQuery(ctx, d, queryString, func(rows *sql.Rows) error {
			var schema string
			if err := rows.Scan(&schema); err != nil {
				return err
			}
			schemas = append(schemas, schema)
			return nil
		})
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		return sendJSONResponse(sender, 200, schemas)
	case "tables":
		queryString := "SHOW TABLES"
		if body.Schema != "" {
			queryString = fmt.Sprintf("SHOW TABLES IN %s", body.Schema)
			if body.Catalog != "" {
				queryString = fmt.Sprintf("SHOW TABLES IN %s.%s", body.Catalog, body.Schema)
			}
		}
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)

		tables := make([]string, 0)
		err = executeQuery(ctx, d, queryString, func(rows *sql.Rows) error {
			var database string
			var tableName string
			var isTemporary bool
			if err := rows.Scan(&database, &tableName, &isTemporary); err != nil {
				return err
			}
			tables = append(tables, tableName)
			return nil
		})
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		return sendJSONResponse(sender, 200, tables)
	case "columns":
		queryString := fmt.Sprintf("DESCRIBE TABLE %s", body.Table)
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)

		columnsResponse := make([]columnsResponseBody, 0)
		err = executeQuery(ctx, d, queryString, func(rows *sql.Rows) error {
			var colName sql.NullString
			var colType sql.NullString
			var comment sql.NullString
			if err := rows.Scan(&colName, &colType, &comment); err != nil {
				return err
			}
			columnsResponse = append(columnsResponse, columnsResponseBody{
				ColumnName: colName.String,
				ColumnType: colType.String,
			})
			return nil
		})
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}

		return sendJSONResponse(sender, 200, columnsResponse)
	case "defaults":
		queryString := "SELECT current_catalog(), current_schema();"
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)
		rows, err := d.QueryContext(ctx, queryString)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		defer rows.Close()
		var currentCatalog sql.NullString
		var currentSchema sql.NullString
		if rows.Next() == false {
			log.DefaultLogger.Error("CallResource Error", "err", "No rows returned")
			return fmt.Errorf("no rows returned")
		}
		err = rows.Scan(&currentCatalog, &currentSchema)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}

		defaultsResponse := defaultsResponseBody{
			DefaultCatalog: currentCatalog.String,
			DefaultSchema:  currentSchema.String,
		}

		return sendJSONResponse(sender, 200, defaultsResponse)
	default:
		log.DefaultLogger.Error("CallResource Error", "err", "Unknown URL")
		err := sender.Send(&backend.CallResourceResponse{
			Status: 404,
			Body:   []byte("Unknown URL"),
		})
		return err
	}
}
