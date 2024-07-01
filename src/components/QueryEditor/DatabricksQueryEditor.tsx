import React from 'react';

import { QueryEditorProps } from '@grafana/data';
import {SqlQueryEditor, SQLOptions, QueryHeaderProps, SQLQuery} from 'components/grafana-sql/src';

import { DatabricksDatasource } from '../../datasource';

const queryHeaderProps: Pick<QueryHeaderProps, 'dialect'> = { dialect: 'other' };

export function DatabricksQueryEditor(props: QueryEditorProps<DatabricksDatasource, SQLQuery, SQLOptions>) {
  return <SqlQueryEditor {...props} queryHeaderProps={queryHeaderProps} />;
}
