import {DataSourceInstanceSettings, ScopedVars} from '@grafana/data';
import {LanguageDefinition} from '@grafana/experimental';
import {TemplateSrv} from '@grafana/runtime';
import {DB, formatSQL, SqlDatasource, SQLQuery, SQLSelectableValue} from 'components/grafana-sql/src';

import {PostgresQueryModel} from './PostgresQueryModel';
import {fetchColumns, fetchTables, getSqlCompletionProvider} from './sqlCompletionProvider';
import {getFieldConfig, toRawSql} from './sqlUtil';
import {PostgresOptions} from './types';

export class PostgresDatasource extends SqlDatasource {
  sqlLanguageDefinition: LanguageDefinition | undefined = undefined;

  constructor(instanceSettings: DataSourceInstanceSettings<PostgresOptions>) {
    super(instanceSettings);
    // this.setDefaults();
  }

  getQueryModel(target?: SQLQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars): PostgresQueryModel {
    return new PostgresQueryModel(target, templateSrv, scopedVars);
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
          if (!catalog) {
          return [];
          }
          return this.fetchSchemas(catalog);
      },
      tables: async (catalog, schema) => {
        if (!catalog || !schema) {
          return [];
        }
        return this.fetchTables(catalog, schema);
      },
      getEditorLanguageDefinition: () => this.getSqlLanguageDefinition(this.db),
      fields: async (query: SQLQuery) => {
        if (!query?.table || !query?.catalog || !query?.schema) {
          return [];
        }
        return this.fetchFields(query.table, query.schema, query.catalog);
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
