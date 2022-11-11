import { defaults } from 'lodash';

import React, {FormEvent, useState} from 'react';
import { AutoSizeInput, InlineFieldRow, InlineField, useTheme, InlineSwitch } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import Editor from "@monaco-editor/react";
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';
import * as monaco from "monaco-editor";

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor(props: Props) {

    const [, setQueryText] = useState("")
    const [sqlEditorSelected, setSqlEditorSelected] = useState(false)
    const onQuerryChange = (value: string | undefined, ev: monaco.editor.IModelContentChangedEvent) => {
        setQueryText(value || "")
        const { onChange, query } = props;
        onChange({ ...query, rawSqlQuery: value });
    };

    const onSQLSwitchChange = (event: any) => {
        const { onChange, query } = props;
        onChange({ ...query, rawSqlSelected: !sqlEditorSelected });
        setSqlEditorSelected(!sqlEditorSelected);
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

    const query = defaults(props.query, defaultQuery);
    const { timeColumnName, valueColumnName, whereQuery, tableName } = query;
    const theme = useTheme()
    return (
      <div className="gf-form" style={{ flexDirection: "column", rowGap: "8px"}}>
          {sqlEditorSelected ? (
              <Editor
                  height="200px"
                  theme={theme.isDark ? "vs-dark" : "vs-light"}
                  defaultLanguage="sql"
                  defaultValue="SELECT $__time(time_column), $__value(value_column) FROM catalog.default.table_name WHERE $__timeFilter(time_column) GROUP BY $__timeWindow(time_column)"
                  onChange={onQuerryChange}
              />
          ) : (
              <>
                  <InlineFieldRow>
                      <InlineField label="Time Column" labelWidth={16} tooltip="The column name of the time column">
                          <AutoSizeInput
                              value={timeColumnName || ''}
                              onCommitChange={ontimeColumnNameTextChange}
                              minWidth={32}
                              defaultValue="timestamp"
                              required
                          />
                      </InlineField>
                  </InlineFieldRow>
                  <InlineFieldRow>
                      <InlineField label="Value Column" labelWidth={16} tooltip="The column name of the value to query">
                          <AutoSizeInput
                              value={valueColumnName || ''}
                              onCommitChange={onvalueColumnNameChange}
                              minWidth={32}
                              defaultValue="value"
                              required
                          />
                      </InlineField>
                  </InlineFieldRow>
                  <InlineFieldRow>
                      <InlineField label="Table Name" labelWidth={16} tooltip="(Catalog), Schema and Table Name in the format (<catalog>).<schema>.<table_name>">
                          <AutoSizeInput
                              value={tableName || ''}
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
                      value={sqlEditorSelected}
                      onChange={onSQLSwitchChange}
                  />
              </InlineField>
          </InlineFieldRow>
      </div>
    );
}
