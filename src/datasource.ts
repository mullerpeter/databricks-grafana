import {DataSourceInstanceSettings, ScopedVars} from '@grafana/data';
import {LanguageDefinition} from '@grafana/experimental';
import {TemplateSrv} from '@grafana/runtime';
import {DB, formatSQL, SqlDatasource, SQLQuery, SQLSelectableValue} from 'components/grafana-sql/src';

import {DatabricksQueryModel} from './DatabricksQueryModel';
import {
  fetchColumns,
  fetchSuggestions,
  getSqlCompletionProvider
} from './sqlCompletionProvider';
import {getFieldConfig, toRawSql} from './sqlUtil';
import {ColumnResponse, DatabricksDataSourceOptions} from './types';

export class DatabricksDatasource extends SqlDatasource {
  sqlLanguageDefinition: LanguageDefinition | undefined = undefined;

  constructor(instanceSettings: DataSourceInstanceSettings<DatabricksDataSourceOptions>) {
    super(instanceSettings);
    this.setDefaults();
  }

  getQueryModel(target?: SQLQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars): DatabricksQueryModel {
    return new DatabricksQueryModel(target, templateSrv, scopedVars);
  }

  async setDefaults(): Promise<void> {
    const defaults: any = await this.postResource("defaults", {})
    this.defaultCatalog = defaults.defaultCatalog;
    this.defaultSchema = defaults.defaultSchema;
    if (this.defaultCatalog) {
      this.addToFetchedCatalogsSchemas(this.defaultCatalog, this.defaultSchema);
    }
  }

  addToFetchedCatalogsSchemas(catalog: string, schema: string | undefined): void {
    if (!this.fetchedCatalogsSchemas.catalogs[catalog]) {
      this.fetchedCatalogsSchemas.catalogs[catalog] = {
        name: catalog,
        schemas: {}
      }
    }
    if (schema && !this.fetchedCatalogsSchemas.catalogs[catalog]?.schemas[schema]) {
      this.fetchedCatalogsSchemas.catalogs[catalog].schemas[schema] = { name: schema };
    }
  }

  async fetchTables(catalog = this.defaultCatalog, schema = this.defaultSchema): Promise<string[]> {
    if (!catalog || !schema) {
      return [];
    }
    if (!this.fetchedCatalogsSchemas?.catalogs[catalog]?.schemas[schema]) {
        return [];
    }
    return await this.postResource("tables", {catalog: catalog, schema: schema})
  }

  async fetchSchemas(catalog = this.defaultCatalog): Promise<string[]> {
    if (!catalog || !this.fetchedCatalogsSchemas || !this.fetchedCatalogsSchemas?.catalogs[catalog]) {
      return [];
    }
    const schemas = await this.postResource("schemas", {catalog}) as string[];
    schemas.forEach(schema => this.addToFetchedCatalogsSchemas(catalog, schema));
    return schemas;
  }

  async fetchCatalogs(): Promise<string[]> {
    const catalogs = await this.postResource("catalogs", {}) as string[];
    catalogs.forEach(catalog => this.addToFetchedCatalogsSchemas(catalog, undefined));
    return catalogs;
  }

  getSqlLanguageDefinition(db: DB): LanguageDefinition {
    if (this.sqlLanguageDefinition !== undefined) {
      return this.sqlLanguageDefinition;
    }

    const args = {
      getColumns: { current: (query: SQLQuery) => fetchColumns(db, query) },
      getSuggestions: { current: (value: string) => fetchSuggestions(value, db) }
    };
    this.sqlLanguageDefinition = {
      id: 'sql',
      completionProvider: getSqlCompletionProvider(args),
      formatter: formatSQL,
    };
    return this.sqlLanguageDefinition;
  }

  async fetchFields(table: string | undefined, schema = this.defaultSchema, catalog = this.defaultCatalog): Promise<SQLSelectableValue[]> {
    if (!table || !catalog || !schema) {
      return [];
    }
    const response: ColumnResponse[] = await this.postResource("columns", {table: `${catalog}.${schema}.${table}`});
    return response.map(({name: column, type}) => ({ label: column, value: column, type, ...getFieldConfig(type) }));
  }

  getDB(): DB {
    if (this.db !== undefined) {
      return this.db;
    }

    return {
      init: () => Promise.resolve(true),
      catalogs: () => this.fetchCatalogs(),
      schemas: async (catalog) => this.fetchSchemas(catalog),
      tables: async (catalog, schema) =>  this.fetchTables(catalog, schema),
      getEditorLanguageDefinition: () => this.getSqlLanguageDefinition(this.db),
      fields: async (catalog, schema, table) => this.fetchFields(table, schema, catalog),
      validateQuery: (query) =>
        Promise.resolve({ isError: false, isValid: true, query, error: '', rawSql: query.rawSql }),
      dsID: () => this.id,
      toRawSql,
      lookup: async () => {
        const catalogs = await this.fetchCatalogs();
        return catalogs.map((t) => ({ name: t, completion: t }));
      },
    };
  }
}


