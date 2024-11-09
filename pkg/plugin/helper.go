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
		rows, err := d.QueryContext(ctx, "SHOW CATALOGS")
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		defer rows.Close()
		catalogs := make([]string, 0)
		for rows.Next() {
			var catalog string
			err := rows.Scan(&catalog)
			if err != nil {
				log.DefaultLogger.Error("CallResource Error", "err", err)
				return err
			}
			catalogs = append(catalogs, catalog)
		}
		err = rows.Err()
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		jsonBody, err := json.Marshal(catalogs)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		err = sender.Send(&backend.CallResourceResponse{
			Status: 200,
			Body:   jsonBody,
		})
		return err
	case "schemas":
		queryString := "SHOW SCHEMAS"

		if body.Catalog != "" {
			queryString = fmt.Sprintf("SHOW SCHEMAS IN %s", body.Catalog)
		}
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)
		rows, err := d.QueryContext(ctx, queryString)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		defer rows.Close()
		schemas := make([]string, 0)
		for rows.Next() {
			var schema string
			err := rows.Scan(&schema)
			if err != nil {
				log.DefaultLogger.Error("CallResource Error", "err", err)
				return err
			}
			schemas = append(schemas, schema)
		}
		err = rows.Err()
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		jsonBody, err := json.Marshal(schemas)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		err = sender.Send(&backend.CallResourceResponse{
			Status: 200,
			Body:   jsonBody,
		})
		return err
	case "tables":
		queryString := "SHOW TABLES"
		if body.Schema != "" {
			queryString = fmt.Sprintf("SHOW TABLES IN %s", body.Schema)
			if body.Catalog != "" {
				queryString = fmt.Sprintf("SHOW TABLES IN %s.%s", body.Catalog, body.Schema)
			}
		}
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)
		rows, err := d.QueryContext(ctx, queryString)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		defer rows.Close()
		tables := make([]string, 0)
		for rows.Next() {
			var database string
			var tableName string
			var isTemporary bool
			err := rows.Scan(&database, &tableName, &isTemporary)
			if err != nil {
				log.DefaultLogger.Error("CallResource Error", "err", err)
				return err
			}
			tables = append(tables, tableName)
		}
		err = rows.Err()
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		jsonBody, err := json.Marshal(tables)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		err = sender.Send(&backend.CallResourceResponse{
			Status: 200,
			Body:   jsonBody,
		})
		return err
	case "columns":
		queryString := fmt.Sprintf("DESCRIBE TABLE %s", body.Table)
		log.DefaultLogger.Info("CallResource called", "queryString", queryString)
		rows, err := d.QueryContext(ctx, queryString)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		defer rows.Close()
		columnsResponse := make([]columnsResponseBody, 0)
		for rows.Next() {
			var colName sql.NullString
			var colType sql.NullString
			var comment sql.NullString
			err := rows.Scan(&colName, &colType, &comment)
			if err != nil {
				log.DefaultLogger.Error("CallResource Error", "err", err)
				return err
			}
			columnsResponse = append(columnsResponse, columnsResponseBody{
				ColumnName: colName.String,
				ColumnType: colType.String,
			})
		}
		err = rows.Err()
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}

		jsonBody, err := json.Marshal(columnsResponse)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		err = sender.Send(&backend.CallResourceResponse{
			Status: 200,
			Body:   jsonBody,
		})
		return err
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

		jsonBody, err := json.Marshal(defaultsResponse)
		if err != nil {
			log.DefaultLogger.Error("CallResource Error", "err", err)
			return err
		}
		err = sender.Send(&backend.CallResourceResponse{
			Status: 200,
			Body:   jsonBody,
		})
		return err
	default:
		log.DefaultLogger.Error("CallResource Error", "err", "Unknown URL")
		err := sender.Send(&backend.CallResourceResponse{
			Status: 404,
			Body:   []byte("Unknown URL"),
		})
		return err
	}
}
