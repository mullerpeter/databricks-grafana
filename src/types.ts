import { SQLOptions } from 'components/grafana-sql/src';

/**
 * These are options configured for each DataSource instance.
 */
export interface DatabricksDataSourceOptions extends SQLOptions {
  hostname?: string;
  port?: string;
  path?: string;
  authenticationMethod?: string;
  clientId?: string;
  externalCredentialsUrl?: string;
  oauthScopes?: string;
  retries?: string;
  retryBackoff?: string;
  maxRetryDuration?: string;
  timeout?: string;
  maxRows?: string;
  oauthPassThru?: boolean;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface DatabricksSecureJsonData {
  token?: string;
  clientSecret?: string;
}

export type ColumnResponse = {
  name: string;
  type: string;
};