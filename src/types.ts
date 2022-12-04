import { DataQuery, DataSourceJsonData } from '@grafana/data';

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
  path?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  token?: string;
}

export interface MyVariableQuery {
  namespace: string;
  rawQuery: string;
}
