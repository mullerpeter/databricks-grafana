import { DataSourcePlugin } from '@grafana/data';

import { CheatSheet } from './components/QueryEditor/CheatSheet';
import { DatabricksQueryEditor } from './components/QueryEditor/DatabricksQueryEditor';
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
