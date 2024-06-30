import { SQLOptions } from 'components/grafana-sql/src';
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

export enum PostgresTLSModes {
  disable = 'disable',
  require = 'require',
  verifyCA = 'verify-ca',
  verifyFull = 'verify-full',
}

export enum PostgresTLSMethods {
  filePath = 'file-path',
  fileContent = 'file-content',
}
export interface PostgresOptions extends SQLOptions {
  tlsConfigurationMethod?: PostgresTLSMethods;
  sslmode?: PostgresTLSModes;
  sslRootCertFile?: string;
  sslCertFile?: string;
  sslKeyFile?: string;
  postgresVersion?: number;
  timescaledb?: boolean;
  enableSecureSocksProxy?: boolean;
}


/**
 * These are options configured for each DataSource instance.
 */
export interface DatabricksDataSourceOptions extends SQLOptions {
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
export interface DatabricksSecureJsonData {
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

export interface MyDataSourceOptions extends DataSourceJsonData {
  hostname?: string;
  port?: string;
  path?: string;
  connMaxIdleTime?: number;
  autoCompletion?: boolean;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  token?: string;
}
