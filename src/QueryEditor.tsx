import { defaults } from 'lodash';

import React, { PureComponent, FormEvent } from 'react';
import { AutoSizeInput, InlineFieldRow, InlineField } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {

  ontableNameChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = this.props;
    onChange({ ...query, tableName: event.currentTarget.value });
  };


  ontimeColumnNameTextChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = this.props;
    onChange({ ...query, timeColumnName: event.currentTarget.value });
  };


  onvalueColumnNameChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = this.props;
    onChange({ ...query, valueColumnName: event.currentTarget.value });
  };


  onwhereQueryChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = this.props;
    onChange({ ...query, whereQuery: event.currentTarget.value });
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { timeColumnName, valueColumnName, whereQuery, tableName } = query;

    return (
      <div className="gf-form" style={{ flexDirection: "column", rowGap: "8px"}}>
          <InlineFieldRow>
              <InlineField label="Time Column" labelWidth={16}>
                  <AutoSizeInput
                      value={timeColumnName || ''}
                      onCommitChange={this.ontimeColumnNameTextChange}
                      minWidth={32}
                      defaultValue="timestamp"
                      required
                  />
              </InlineField>
          </InlineFieldRow>
          <InlineFieldRow>
              <InlineField label="Value Column" labelWidth={16}>
                  <AutoSizeInput
                      value={valueColumnName || ''}
                      onCommitChange={this.onvalueColumnNameChange}
                      minWidth={32}
                      defaultValue="value"
                      required
                  />
              </InlineField>
          </InlineFieldRow>
          <InlineFieldRow>
              <InlineField label="Table Name" labelWidth={16} tooltip="Schema and Table Name in the format <schema>.<table_name>">
                  <AutoSizeInput
                      value={tableName || ''}
                      onCommitChange={this.ontableNameChange}
                      minWidth={32}
                      placeholder="default.table_name"
                      required
                  />
              </InlineField>
          </InlineFieldRow>
          <InlineFieldRow>
              <InlineField label="Where SQL" labelWidth={16}>
                  <AutoSizeInput
                      value={whereQuery || ''}
                      onCommitChange={this.onwhereQueryChange}
                      minWidth={32}
                      placeholder="id = 1 AND name = 'Peter'"
                  />
              </InlineField>
          </InlineFieldRow>
      </div>
    );
  }
}
