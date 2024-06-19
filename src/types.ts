import {DataQuery, DataSourceJsonData} from '@grafana/data';

interface QuerySettings {
  convertLongToWide: boolean
  fillMode?: number
  fillValue?: number
}
export interface MyQuery extends DataQuery {
  rawSqlQuery?: string;
  querySettings: QuerySettings;
}

export const defaultQuery: Partial<MyQuery> = {
  querySettings: {
    convertLongToWide: true,
    fillMode: 1,
  },
  rawSqlQuery: "SELECT $__time(time_column), $__value(value_column) FROM catalog.default.table_name WHERE $__timeFilter(time_column) GROUP BY $__timeWindow(time_column)"
};

/**
 * These are options configured for each DataSource instance.
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  hostname?: string;
  port?: string;
  path?: string;
  autoCompletion?: boolean;
  authenticationMethod?: string;
  clientId?: string;
  externalCredentialsUrl?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  token?: string;
  clientSecret?: string;
}

export interface MyVariableQuery {
  namespace: string;
  rawQuery: string;
}

export interface Column {
  name: string
  type: string
}

export interface Suggestions {
  catalogs: string[]
  schemas: string[]
  tables: string[]
  columns: Column[]
}
