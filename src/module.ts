import { DataSourcePlugin } from '@grafana/data';

import { CheatSheet } from './CheatSheet';
import { DatabricksQueryEditor } from './DatabricksQueryEditor';
import { ConfigEditor } from './components/ConfigEditor/ConfigEditor';
import { DatabricksDatasource } from './datasource';
import { DatabricksDataSourceOptions, DatabricksSecureJsonData } from './types';
import {SQLQuery} from "./components/grafana-sql/src";

export const plugin = new DataSourcePlugin<DatabricksDatasource, SQLQuery, DatabricksDataSourceOptions, DatabricksSecureJsonData>(
  DatabricksDatasource
)
  .setQueryEditor(DatabricksQueryEditor)
  .setQueryEditorHelp(CheatSheet)
  .setConfigEditor(ConfigEditor);
