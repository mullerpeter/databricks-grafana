# Changelog

## 1.1.6

- Bugfix: Correctly scope Databricks Connection to Datasource instance, in order to support multiple Databricks Datasources

---

### 1.1.5

- Upgrade databricks-sql-go dependency to v1.4.0

---

### 1.1.4

- Add annotations support

---

### 1.1.3

- Add variable query support
- Bugfix: Remove leading slash from SQL path in configuration


### 1.1.2

- Use scoped Variables in template variable replacement

### 1.1.0

- Adds proper type reflection to support all databricks data types. (except type `BINARY` which is not supported)

### 1.0.0

#### Breaking Changes: 

- Datasource configuration (`hostname` & `sql path`) needs to be entered again in the Datasource Settings after upgrading.
- Queries made via Visual Editor no longer work.

---

- Removed visual Query Editor
- Added default Long to Wide Dataframe transformation to support multiline time-series data
- Made some config vars non secret
- Added alerting capability


### 0.0.9

- Init new DB connection on Invalid SessionHandle error

### 0.0.8

- Adds temp fix for Invalid SessionHandle 

### 0.0.7

- Adds support for custom variables in SQL editor

### 0.0.6

- Adds support for multiple metrics queries (SQL Editor only)
- Fixes bug where saved query was not displayed in query builder

### 0.0.5

- Adds full text SQL query editor with macros
