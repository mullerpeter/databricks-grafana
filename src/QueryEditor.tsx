import { defaults } from 'lodash';

import React, {FormEvent } from 'react';
import { AutoSizeInput, InlineFieldRow, InlineField, InlineSwitch, CodeEditor } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor(props: Props) {

    const query = defaults(props.query, defaultQuery);
    const { timeColumnName, valueColumnName, whereQuery, tableName, rawSqlQuery, rawSqlSelected } = query;

    const onSQLQueryChange = (value: string) => {
        const { onChange, query } = props;
        onChange({ ...query, rawSqlQuery: value });
    };

    const onSQLSwitchChange = (event: any) => {
        const { onChange, query } = props;
        onChange({ ...query, rawSqlSelected: !rawSqlSelected });
    };
  const ontableNameChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = props;
    onChange({ ...query, tableName: event.currentTarget.value });
  };


  const ontimeColumnNameTextChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = props;
    onChange({ ...query, timeColumnName: event.currentTarget.value });
  };


  const onvalueColumnNameChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = props;
    onChange({ ...query, valueColumnName: event.currentTarget.value });
  };


  const onwhereQueryChange = (event: FormEvent<HTMLInputElement>) => {
      console.log(event);
    const { onChange, query } = props;
    onChange({ ...query, whereQuery: event.currentTarget.value });
  };


    return (
      <div className="gf-form" style={{ flexDirection: "column", rowGap: "8px"}}>
          {rawSqlSelected ? (
              <div className="code-wrapper" style={{ width: "100%" }}>
                  <CodeEditor
                  value={rawSqlQuery || ""}
                  language="sql"
                  height="200px"
                  width="100%"
                  onBlur={onSQLQueryChange}
                  onSave={onSQLQueryChange}
                  showMiniMap={false}
                  showLineNumbers={false}
                  />
              </div>
          ) : (
              <>
                  <InlineFieldRow>
                      <InlineField label="Time Column" labelWidth={16} tooltip="The column name of the time column">
                          <AutoSizeInput
                              value={timeColumnName || ''}
                              defaultValue={timeColumnName || ''}
                              onCommitChange={ontimeColumnNameTextChange}
                              minWidth={32}
                              placeholder="timestamp"
                              required
                          />
                      </InlineField>
                  </InlineFieldRow>
                  <InlineFieldRow>
                      <InlineField label="Value Column" labelWidth={16} tooltip="The column name of the value to query">
                          <AutoSizeInput
                              value={valueColumnName || ''}
                              defaultValue={valueColumnName || ''}
                              onCommitChange={onvalueColumnNameChange}
                              minWidth={32}
                              placeholder="value"
                              required
                          />
                      </InlineField>
                  </InlineFieldRow>
                  <InlineFieldRow>
                      <InlineField label="Table Name" labelWidth={16} tooltip="(Catalog), Schema and Table Name in the format (<catalog>).<schema>.<table_name>">
                          <AutoSizeInput
                              value={tableName || ''}
                              defaultValue={tableName || ''}
                              onCommitChange={ontableNameChange}
                              minWidth={32}
                              placeholder="catalog.default.table_name"
                              required
                          />
                      </InlineField>
                  </InlineFieldRow>
                  <InlineFieldRow>
                      <InlineField label="Where SQL" labelWidth={16} tooltip="Additional WHERE conditions to filter the queried data (Databricks SQL)">
                          <AutoSizeInput
                              value={whereQuery || ''}
                              defaultValue={whereQuery || ''}
                              onCommitChange={onwhereQueryChange}
                              minWidth={32}
                              placeholder="id = 1 AND name = 'Peter'"
                          />
                      </InlineField>
                  </InlineFieldRow>
              </>
          )}
          <InlineFieldRow>
              <InlineField label="SQL Editor" labelWidth={16}>
                  <InlineSwitch
                      value={rawSqlSelected}
                      onChange={onSQLSwitchChange}
                  />
              </InlineField>
          </InlineFieldRow>
      </div>
    );
}
