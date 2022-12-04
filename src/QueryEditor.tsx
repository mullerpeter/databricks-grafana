import { defaults } from 'lodash';

import React, {FormEvent, useState } from 'react';
import {
    AutoSizeInput,
    InlineFieldRow,
    InlineField,
    InlineSwitch,
    CodeEditor,
    Collapse,
    Select,
    ActionMeta,
} from '@grafana/ui';
import {QueryEditorProps, SelectableValue} from '@grafana/data';

import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor(props: Props) {

    const options = [
        { label: 'Previous', value: 0, description: 'fills with the last seen value unless that does not exist, in which case it fills with null.' },
        { label: 'Null', value: 1, description: 'fills with null.' },
        { label: 'Value', value: 2, description: 'fills with a specific value' },
    ];

    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    const query = defaults(props.query, defaultQuery);
    const { rawSqlQuery, querySettings } = query;

    const onSQLQueryChange = (value: string) => {
        const { onChange, query } = props;
        onChange({ ...query, rawSqlQuery: value });
    };


    const onLongToWideSwitchChange = (event: any) => {
        const { onChange, query } = props;
        const { querySettings } = query
        onChange({ ...query, querySettings: { ...querySettings, convertLongToWide: !querySettings.convertLongToWide} });
    };


    const onFillValueChange = (event: FormEvent<HTMLInputElement>) => {
        const { onChange, query } = props;
        const { querySettings } = query
        onChange({ ...query, querySettings: { ...querySettings, fillValue: Number(event.currentTarget.value)} });
    };

    const onFillModeChange = (value: SelectableValue<number>, actionMeta: ActionMeta) => {
        const { onChange, query } = props;
        const { querySettings } = query
        onChange({ ...query, querySettings: { ...querySettings, fillMode: value.value} });
    };


    // @ts-ignore
    return (
      <div className="gf-form" style={{ flexDirection: "column", rowGap: "8px"}}>
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
              <Collapse label="Advanced Options" isOpen={isAdvancedOpen} onToggle={() => setIsAdvancedOpen(!isAdvancedOpen)} >
                  <div className="gf-form" style={{ flexDirection: "column", rowGap: "8px"}}>
                      <InlineFieldRow>
                          <InlineField label="Convert Long To Wide" labelWidth={32}>
                              <InlineSwitch
                                  value={querySettings.convertLongToWide}
                                  onChange={onLongToWideSwitchChange}
                              />
                          </InlineField>
                      </InlineFieldRow>
                      <InlineFieldRow>
                          <InlineField disabled={!querySettings.convertLongToWide} label="Fill Mode" labelWidth={32} tooltip="Fill Mode denotes how missing values should be filled.">
                              <Select
                                  width={32}
                                  options={options}
                                  value={querySettings.fillMode}
                                  onChange={onFillModeChange}
                              />
                          </InlineField>
                          {querySettings.fillMode === 2 && (
                              <InlineField disabled={!querySettings.convertLongToWide} label="Fill Value" labelWidth={16}>
                                  <AutoSizeInput
                                      value={querySettings.fillValue || ''}
                                      defaultValue={querySettings.fillValue || ''}
                                      onCommitChange={onFillValueChange}
                                      minWidth={32}
                                      placeholder="0.0"
                                  />
                              </InlineField>
                          )}
                      </InlineFieldRow>
                  </div>
              </Collapse>
      </div>
    );
}
