import {DataSourceInstanceSettings, ScopedVars} from '@grafana/data';
import {LanguageDefinition} from '@grafana/experimental';
import {TemplateSrv} from '@grafana/runtime';
import {DB, formatSQL, SqlDatasource, SQLQuery, SQLSelectableValue} from 'components/grafana-sql/src';

import {PostgresQueryModel} from './PostgresQueryModel';
import {getSchema} from './postgresMetaQuery';
import {fetchColumns, fetchTables, getSqlCompletionProvider} from './sqlCompletionProvider';
import {getFieldConfig, toRawSql} from './sqlUtil';
import {PostgresOptions} from './types';

export class PostgresDatasource extends SqlDatasource {
  sqlLanguageDefinition: LanguageDefinition | undefined = undefined;

  constructor(instanceSettings: DataSourceInstanceSettings<PostgresOptions>) {
    super(instanceSettings);
  }

  getQueryModel(target?: SQLQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars): PostgresQueryModel {
    return new PostgresQueryModel(target, templateSrv, scopedVars);
  }

  async fetchTables(dataset: string): Promise<string[]> {
    return await this.postResource("tables", {catalog: 'samples', schema: dataset})
  }

  async fetchSchemas(): Promise<string[]> {
    return await this.postResource("schemas", {catalog: 'samples'})
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

  async fetchFields(table: string, schema: string): Promise<SQLSelectableValue[]> {
    const response: any = await this.postResource("columns", {table: "samples." + schema + "." + table});
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
      datasets: () => this.fetchSchemas(),
      tables: async (dataset?: string | undefined) => {
        if (!dataset) {
          return [];
        }
        return this.fetchTables(dataset);
      },
      getEditorLanguageDefinition: () => this.getSqlLanguageDefinition(this.db),
      fields: async (query: SQLQuery) => {
        if (!query?.table || !query?.dataset) {
          return [];
        }
        return this.fetchFields(query.table, query.dataset);
      },
      validateQuery: (query) =>
        Promise.resolve({ isError: false, isValid: true, query, error: '', rawSql: query.rawSql }),
      dsID: () => this.id,
      toRawSql,
      lookup: async () => {
        const tables = await this.fetchTables('tpch');
        return tables.map((t) => ({ name: t, completion: t }));
      },
    };
  }
}
