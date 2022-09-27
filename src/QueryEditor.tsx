import { defaults } from 'lodash';

import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {

  ontableNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, tableName: event.target.value });
  };


  ontimeColumnNameTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, timeColumnName: event.target.value });
  };


  onvalueColumnNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, valueColumnName: event.target.value });
  };


  onwhereQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, whereQuery: event.target.value });
  };


  onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, limit: parseInt(event.target.value, 10) });
    // executes the query
    onRunQuery();
  };



  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { limit, timeColumnName, valueColumnName, whereQuery, tableName } = query;

    return (
      <div className="gf-form" style={{ flexDirection: "column", rowGap: "8px"}}>
        <FormField
          width={4}
          value={limit}
          onChange={this.onConstantChange}
          label="Limit"
          type="number"
          step="1"
        />
        <FormField
          labelWidth={8}
          value={timeColumnName || ''}
          onChange={this.ontimeColumnNameTextChange}
          label="Time Column"
          inputWidth={500}
        />
        <FormField
            labelWidth={8}
            value={valueColumnName || ''}
            onChange={this.onvalueColumnNameChange}
            label="Value Column"
            inputWidth={500}
        />
        <FormField
            labelWidth={8}
            value={whereQuery || ''}
            onChange={this.onwhereQueryChange}
            label="Where SQL"
            inputWidth={500}
        />
        <FormField
            labelWidth={8}
            value={tableName || ''}
            onChange={this.ontableNameChange}
            label="Table Name"
            inputWidth={500}
        />
      </div>
    );
  }
}
