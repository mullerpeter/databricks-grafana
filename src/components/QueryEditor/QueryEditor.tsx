import React from 'react';

import { QueryEditorProps } from '@grafana/data';
import {SqlQueryEditor, SQLOptions, QueryHeaderProps, SQLQuery} from 'components/grafana-sql/src';

import { DataSource } from '../../datasource';
const queryHeaderProps: Pick<QueryHeaderProps, 'dialect'> = { dialect: 'other' };

export function PostgresQueryEditor(props: QueryEditorProps<DataSource, SQLQuery, SQLOptions>) {
    return <SqlQueryEditor {...props} queryHeaderProps={queryHeaderProps} />;
}