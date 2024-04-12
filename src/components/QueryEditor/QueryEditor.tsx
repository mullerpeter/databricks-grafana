import React from 'react';

import { QueryEditorProps } from '@grafana/data';
import { SqlQueryEditor, SQLOptions, QueryHeaderProps } from 'components/grafana-sql/src';

import { DataSource } from '../../datasource';
import {MySQLQuery} from "../../PostgresQueryModel";
const queryHeaderProps: Pick<QueryHeaderProps, 'dialect'> = { dialect: 'other' };

export function PostgresQueryEditor(props: QueryEditorProps<DataSource, MySQLQuery, SQLOptions>) {
    return <SqlQueryEditor {...props} queryHeaderProps={queryHeaderProps} />;
}