import {DataSourceInstanceSettings, ScopedVars} from '@grafana/data';
import {LanguageDefinition} from '@grafana/experimental';
import {TemplateSrv} from '@grafana/runtime';
import {DB, formatSQL, SqlDatasource, SQLQuery, SQLSelectableValue} from 'components/grafana-sql/src';

import {DatabricksQueryModel} from './DatabricksQueryModel';
import {fetchColumns, fetchSchemas, fetchTables, getSqlCompletionProvider} from './sqlCompletionProvider';
import {getFieldConfig, toRawSql} from './sqlUtil';
import {DatabricksDataSourceOptions} from './types';

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
  }

  async fetchTables(catalog: string, schema: string): Promise<string[]> {
    return await this.postResource("tables", {catalog: catalog, schema: schema})
  }

  async fetchSchemas(catalog: string): Promise<string[]> {
    return await this.postResource("schemas", {catalog: catalog})
  }

  async fetchCatalogs(): Promise<string[]> {
    return await this.postResource("catalogs", {})
  }

  getSqlLanguageDefinition(db: DB): LanguageDefinition {
    if (this.sqlLanguageDefinition !== undefined) {
      return this.sqlLanguageDefinition;
    }

    const args = {
      getColumns: { current: (query: SQLQuery) => fetchColumns(db, query) },
      getTables: { current: (query: SQLQuery) => fetchTables(db, query) },
      getSchemas: { current: (query: SQLQuery) => fetchSchemas(db, query) },
    };
    this.sqlLanguageDefinition = {
      id: 'sql',
      completionProvider: getSqlCompletionProvider(args),
      formatter: formatSQL,
    };
    return this.sqlLanguageDefinition;
  }

  async fetchFields(table: string, schema: string, catalog: string): Promise<SQLSelectableValue[]> {
    const response: any = await this.postResource("columns", {table: catalog + "." + schema + "." + table});
    const result: SQLSelectableValue[] = [];
    for (let i = 0; i < response.length; i++) {
      const column = response[i].name;
      const type = response[i].type;
      result.push({ label: column, value: column, type, ...getFieldConfig(type) });
    }
    return result;
  }

  getDB(): DB {
    if (this.db !== undefined) {
      return this.db;
    }

    return {
      init: () => Promise.resolve(true),
      catalogs: () => this.fetchCatalogs(),
      schemas: async (catalog) => {
        catalog = catalog || this.defaultCatalog;
        if (!catalog) {
          return [];
        }
        return this.fetchSchemas(catalog);
      },
      tables: async (catalog, schema) => {
        catalog = catalog || this.defaultCatalog;
        schema = schema || this.defaultSchema;
        if (!catalog || !schema) {
          return [];
        }
        return this.fetchTables(catalog, schema);
      },
      getEditorLanguageDefinition: () => this.getSqlLanguageDefinition(this.db),
      fields: async (catalog, schema, table) => {
        catalog = catalog || this.defaultCatalog;
        schema = schema || this.defaultSchema;
        if (!table || !catalog || !schema) {
          return [];
        }
        return this.fetchFields(table, schema, catalog);
      },
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
