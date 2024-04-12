import { DataSourcePlugin } from '@grafana/data';
import { SQLQuery } from 'components/grafana-sql/src';

import { CheatSheet } from './CheatSheet';
import { PostgresQueryEditor } from './PostgresQueryEditor';
import { ConfigEditor } from './components/ConfigEditor/ConfigEditor';
import { PostgresDatasource } from './datasource';
import { PostgresOptions, SecureJsonData } from './types';

export const plugin = new DataSourcePlugin<PostgresDatasource, SQLQuery, PostgresOptions, SecureJsonData>(
  PostgresDatasource
)
  .setQueryEditor(PostgresQueryEditor)
  .setQueryEditorHelp(CheatSheet)
  .setConfigEditor(ConfigEditor);
