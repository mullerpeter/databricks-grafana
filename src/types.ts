import { SQLOptions } from 'components/grafana-sql/src';
import {DataQuery} from '@grafana/data';

interface QuerySettings {
  convertLongToWide: boolean
  fillMode?: number
  fillValue?: number
}
export interface MyQuery extends DataQuery {
  rawSqlQuery?: string;
  querySettings: QuerySettings;
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
