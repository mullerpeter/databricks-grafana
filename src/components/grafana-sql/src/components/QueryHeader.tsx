import React, {useCallback, useEffect, useState} from 'react';
import {useCopyToClipboard} from 'react-use';
import {v4 as uuidv4} from 'uuid';

import {SelectableValue} from '@grafana/data';
import {EditorField, EditorHeader, EditorMode, EditorRow, FlexItem, InlineSelect} from '@grafana/experimental';
import {reportInteraction} from '@grafana/runtime';
import {Button, InlineField, InlineFieldRow, InlineSwitch, Input, RadioButtonGroup, Space, Tooltip} from '@grafana/ui';

import {QueryWithDefaults} from '../defaults';
import {DB, QUERY_FORMAT_OPTIONS, QueryFormat, QueryRowFilter, SQLDialect, SQLQuery} from '../types';

import {ConfirmModal} from './ConfirmModal';
import {SchemaSelector} from './SchemaSelector';
import {TableSelector} from './TableSelector';
import {CatalogSelector} from "./CatalogSelector";

export interface QueryHeaderProps {
    db: DB;
    dialect: SQLDialect;
    isQueryRunnable: boolean;
    onChange: (query: SQLQuery) => void;
    onQueryRowChange: (queryRowFilter: QueryRowFilter) => void;
    onRunQuery: () => void;
    preconfiguredCatalog: string | undefined;
    preconfiguredSchema: string | undefined;
    query: QueryWithDefaults;
    queryRowFilter: QueryRowFilter;
}

const editorModes = [
    {label: 'Builder', value: EditorMode.Builder},
    {label: 'Code', value: EditorMode.Code},
];

export function QueryHeader({
                                db,
                                dialect,
                                isQueryRunnable,
                                onChange,
                                onQueryRowChange,
                                onRunQuery,
                                preconfiguredCatalog,
                                preconfiguredSchema,
                                query,
                                queryRowFilter,
                            }: QueryHeaderProps) {
    const {editorMode} = query;
    const [_, copyToClipboard] = useCopyToClipboard();
    const [showConfirm, setShowConfirm] = useState(false);
    const toRawSql = db.toRawSql;

    const onEditorModeChange = useCallback(
        (newEditorMode: EditorMode) => {
            if (newEditorMode === EditorMode.Code) {
                reportInteraction('grafana_sql_editor_mode_changed', {
                    datasource: query.datasource?.type,
                    selectedEditorMode: EditorMode.Code,
                });
            }

            if (editorMode === EditorMode.Code) {
                setShowConfirm(true);
                return;
            }
            onChange({...query, editorMode: newEditorMode});
        },
        [editorMode, onChange, query]
    );

    const onFormatChange = (e: SelectableValue) => {
        const next = {...query, format: e.value !== undefined ? e.value : QueryFormat.Table, querySettings: {...query.querySettings, convertLongToWide: e.value === QueryFormat.Table ? false : query.querySettings?.convertLongToWide || false}};

        reportInteraction('grafana_sql_format_changed', {
            datasource: query.datasource?.type,
            selectedFormat: next.format,
        });
        onChange(next);
    };

    const onSchemaChange = (e: SelectableValue) => {
        if (e.value === query.schema) {
            return;
        }

        const next = {
            ...query,
            schema: e.value,
            table: undefined,
            sql: undefined,
            rawSql: '',
        };

        onChange(next);
    };

    const onCatalogChange = (e: SelectableValue) => {
        if (e.value === query.catalog) {
            return;
        }

        const next = {
            ...query,
            catalog: e.value,
            table: undefined,
            schema: undefined,
            sql: undefined,
            rawSql: '',
        };

        onChange(next);
    };

    const onTableChange = (e: SelectableValue) => {
        if (e.value === query.table) {
            return;
        }

        const next: SQLQuery = {
            ...query,
            table: e.value,
            sql: undefined,
            rawSql: '',
        };

        onChange(next);
    };

    const [unityCatalogEnabled, setUnityCatalogEnabled] = useState(false);

    useEffect( () => {
        const asyncCall = async () => {
            const result = await db.checkIfUnityCatalogEnabled();
            setUnityCatalogEnabled(result);
        }

        asyncCall()
            .catch(console.error);
    }, []);

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
            <EditorHeader>
                <InlineSelect
                    label="Format"
                    value={query.format}
                    placeholder="Select format"
                    menuShouldPortal
                    onChange={onFormatChange}
                    options={QUERY_FORMAT_OPTIONS}
                />

                {editorMode === EditorMode.Builder && (
                    <>
                        <InlineSwitch
                            id={`sql-filter-${uuidv4()}}`}
                            label="Filter"
                            transparent={true}
                            showLabel={true}
                            value={queryRowFilter.filter}
                            onChange={(ev) => {
                                if (!(ev.target instanceof HTMLInputElement)) {
                                    return;
                                }

                                reportInteraction('grafana_sql_filter_toggled', {
                                    datasource: query.datasource?.type,
                                    displayed: ev.target.checked,
                                });

                                onQueryRowChange({...queryRowFilter, filter: ev.target.checked});
                            }}
                        />

                        <InlineSwitch
                            id={`sql-group-${uuidv4()}}`}
                            label="Group"
                            transparent={true}
                            showLabel={true}
                            value={queryRowFilter.group}
                            onChange={(ev) => {
                                if (!(ev.target instanceof HTMLInputElement)) {
                                    return;
                                }

                                reportInteraction('grafana_sql_group_toggled', {
                                    datasource: query.datasource?.type,
                                    displayed: ev.target.checked,
                                });

                                onQueryRowChange({...queryRowFilter, group: ev.target.checked});
                            }}
                        />

                        <InlineSwitch
                            id={`sql-order-${uuidv4()}}`}
                            label="Order"
                            transparent={true}
                            showLabel={true}
                            value={queryRowFilter.order}
                            onChange={(ev) => {
                                if (!(ev.target instanceof HTMLInputElement)) {
                                    return;
                                }

                                reportInteraction('grafana_sql_order_toggled', {
                                    datasource: query.datasource?.type,
                                    displayed: ev.target.checked,
                                });

                                onQueryRowChange({...queryRowFilter, order: ev.target.checked});
                            }}
                        />

                        <InlineSwitch
                            id={`sql-preview-${uuidv4()}}`}
                            label="Preview"
                            transparent={true}
                            showLabel={true}
                            value={queryRowFilter.preview}
                            onChange={(ev) => {
                                if (!(ev.target instanceof HTMLInputElement)) {
                                    return;
                                }

                                reportInteraction('grafana_sql_preview_toggled', {
                                    datasource: query.datasource?.type,
                                    displayed: ev.target.checked,
                                });

                                onQueryRowChange({...queryRowFilter, preview: ev.target.checked});
                            }}
                        />
                    </>
                )}

                {query.format === QueryFormat.Timeseries && (
                <InlineSwitch
                    id={`long-to-wide-${uuidv4()}}`}
                    label="Long To Wide"
                    transparent={true}
                    showLabel={true}
                    value={query.querySettings?.convertLongToWide || false}
                    onChange={(ev) => {
                        if (!(ev.target instanceof HTMLInputElement)) {
                            return;
                        }

                        const {querySettings} = query
                        onChange({...query, querySettings: {...querySettings, convertLongToWide: ev.target.checked}});

                    }}
                />
                )}

                {editorMode === EditorMode.Code && query.querySettings?.convertLongToWide && (
                    <InlineFieldRow>
                        <Space h={1.0}/>
                        <InlineSelect
                            label="Fill Mode"
                            value={query.querySettings?.fillMode}
                            placeholder="Select Fill Mode"
                            menuShouldPortal
                            width={20}
                            onChange={(e: SelectableValue) => {
                                const {querySettings} = query;
                                const next = {
                                    ...query,
                                    querySettings: {...querySettings, fillMode: e.value !== undefined ? e.value : 0}
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
                                        width={20}
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
                )}

                <FlexItem grow={1}/>

                {isQueryRunnable ? (
                    <Button icon="play" variant="primary" size="sm" onClick={() => onRunQuery()}>
                        Run query
                    </Button>
                ) : (
                    <Tooltip
                        theme="error"
                        content={
                            <>
                                Your query is invalid. Check below for details. <br/>
                                However, you can still run this query.
                            </>
                        }
                        placement="top"
                    >
                        <Button icon="exclamation-triangle" variant="secondary" size="sm" onClick={() => onRunQuery()}>
                            Run query
                        </Button>
                    </Tooltip>
                )}

                <RadioButtonGroup options={editorModes} size="sm" value={editorMode} onChange={onEditorModeChange}/>

                <ConfirmModal
                    isOpen={showConfirm}
                    onCopy={() => {
                        reportInteraction('grafana_sql_editor_mode_changed', {
                            datasource: query.datasource?.type,
                            selectedEditorMode: EditorMode.Builder,
                            type: 'copy',
                        });

                        setShowConfirm(false);
                        copyToClipboard(query.rawSql!);
                        onChange({
                            ...query,
                            rawSql: toRawSql(query),
                            editorMode: EditorMode.Builder,
                        });
                    }}
                    onDiscard={() => {
                        reportInteraction('grafana_sql_editor_mode_changed', {
                            datasource: query.datasource?.type,
                            selectedEditorMode: EditorMode.Builder,
                            type: 'discard',
                        });

                        setShowConfirm(false);
                        onChange({
                            ...query,
                            rawSql: toRawSql(query),
                            editorMode: EditorMode.Builder,
                        });
                    }}
                    onCancel={() => {
                        reportInteraction('grafana_sql_editor_mode_changed', {
                            datasource: query.datasource?.type,
                            selectedEditorMode: EditorMode.Builder,
                            type: 'cancel',
                        });

                        setShowConfirm(false);
                    }}
                />
            </EditorHeader>

            {editorMode === EditorMode.Builder && (
                <>
                    <Space v={0.5}/>
                    <EditorRow>
                        {unityCatalogEnabled && (
                            <EditorField label="Catalog" width={25}>
                                <CatalogSelector
                                    db={db}
                                    catalog={query.catalog}
                                    dialect={dialect}
                                    preconfiguredCatalog={preconfiguredCatalog}
                                    onChange={onCatalogChange}
                                />
                            </EditorField>
                        )}
                        <EditorField label="Schema" width={25}>
                            <SchemaSelector
                                db={db}
                                catalog={query.catalog}
                                schema={query.schema}
                                dialect={dialect}
                                preconfiguredSchema={preconfiguredSchema}
                                onChange={onSchemaChange}
                                unityCatalogEnabled={unityCatalogEnabled}
                            />
                        </EditorField>
                        <EditorField label="Table" width={25}>
                            <TableSelector
                                db={db}
                                catalog={query.catalog}
                                schema={query.schema}
                                table={query.table}
                                onChange={onTableChange}
                                unityCatalogEnabled={unityCatalogEnabled}
                            />
                        </EditorField>
                    </EditorRow>
                </>
            )}
        </>
    );
}
