import React from 'react';
import {useAsync} from 'react-use';

import {EditorField, EditorRow, EditorRows} from '@grafana/experimental';

import {DB, QueryEditorProps, QueryRowFilter} from '../../types';
import {QueryToolbox} from '../query-editor-raw/QueryToolbox';

import {Preview} from './Preview';
import {SQLGroupByRow} from './SQLGroupByRow';
import {SQLOrderByRow} from './SQLOrderByRow';
import {SQLSelectRow} from './SQLSelectRow';
import {SQLWhereRow} from './SQLWhereRow';
import {InlineField, InlineFieldRow, Input, Select, Space} from "@grafana/ui";
import {SelectableValue} from "@grafana/data";

interface VisualEditorProps extends QueryEditorProps {
    db: DB;
    queryRowFilter: QueryRowFilter;
    onValidate: (isValid: boolean) => void;
    unityCatalogEnabled: boolean;
}

export const VisualEditor = ({query, db, queryRowFilter, onChange, onValidate, range, unityCatalogEnabled}: VisualEditorProps) => {
    const state = useAsync(async () => {
        const fields = await db.fields(unityCatalogEnabled ? query.catalog : undefined, query.schema, query.table);
        return fields;
    }, [db, query.catalog, query.schema, query.table, unityCatalogEnabled]);

    const fillModeSelectOptions = [
        {
            label: 'Previous',
            value: 0,
            description: 'fills with the last seen value unless that does not exist, in which case it fills with null.'
        },
        {label: 'Null', value: 1, description: 'fills with null.'},
        {label: 'Value', value: 2, description: 'fills with a specific value'},
    ];

    return (
        <>
            <EditorRows>
                <EditorRow>
                    <SQLSelectRow fields={state.value || []} query={query} onQueryChange={onChange} db={db}/>
                </EditorRow>
                {queryRowFilter.filter && (
                    <EditorRow>
                        <EditorField label="Filter by column value" optional>
                            <SQLWhereRow fields={state.value || []} query={query} onQueryChange={onChange} db={db}/>
                        </EditorField>
                    </EditorRow>
                )}
                {queryRowFilter.group && (
                    <EditorRow>
                        <EditorField label="Group by column">
                            <SQLGroupByRow fields={state.value || []} query={query} onQueryChange={onChange} db={db}/>
                        </EditorField>
                    </EditorRow>
                )}
                {queryRowFilter.order && (
                    <EditorRow>
                        <SQLOrderByRow fields={state.value || []} query={query} onQueryChange={onChange} db={db}/>
                    </EditorRow>
                )}
                {query.querySettings?.convertLongToWide && (
                    <EditorRow>
                        <EditorField label="Long to Wide" width={25}>
                            <InlineFieldRow>
                                <Select
                                    label="Fill Mode"
                                    value={query.querySettings?.fillMode}
                                    placeholder="Select Fill Mode"
                                    menuShouldPortal
                                    width={25}
                                    onChange={(e: SelectableValue) => {
                                        const {querySettings} = query;
                                        const next = {
                                            ...query,
                                            querySettings: {
                                                ...querySettings,
                                                fillMode: e.value !== undefined ? e.value : 0
                                            }
                                        };
                                        onChange(next);
                                    }}
                                    options={fillModeSelectOptions}
                                />
                                {query.querySettings?.fillMode === 2 && (
                                    <>
                                        <Space h={1.0}/>
                                        <InlineField label="Fill Value">
                                            <Input
                                                value={query.querySettings?.fillValue || ''}
                                                defaultValue={query.querySettings?.fillValue || ''}
                                                width={25}
                                                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                                                    const {querySettings} = query;
                                                    const next = {
                                                        ...query,
                                                        querySettings: {
                                                            ...querySettings,
                                                            fillValue: Number.parseFloat(event.currentTarget.value)
                                                        }
                                                    };
                                                    onChange(next);
                                                }}
                                                placeholder="0.0"
                                            />
                                        </InlineField>
                                    </>
                                )}
                            </InlineFieldRow>
                        </EditorField>
                    </EditorRow>
                )}
                {queryRowFilter.preview && query.rawSql && (
                    <EditorRow>
                        <Preview rawSql={query.rawSql} datasourceType={query.datasource?.type}/>
                    </EditorRow>
                )}
            </EditorRows>
            <QueryToolbox db={db} query={query} onValidate={onValidate} range={range}/>
        </>
    );
};
