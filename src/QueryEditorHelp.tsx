import React from 'react';
import { QueryEditorHelpProps} from '@grafana/data';
import { MyQuery } from './types';

const examples = [
    {
        title: 'Time Range & Windowing',
        expression: "SELECT $__time(time_column), avg(value_column) FROM catalog.default.table_name WHERE $__timeFilter(time_column) GROUP BY $__timeWindow(time_column)",
        label: 'Inserts Time range filters and window aggregation into the query. The resulting query with macros replaced would look like this:',
        resultingQuery: "SELECT window.start, avg(value_column) FROM catalog.default.table_name WHERE time_column BETWEEN '2021-12-31 23:00:00' AND '2022-01-01 22:59:59' GROUP BY window(time_column, '2 HOURS')",
        rawSqlQuery: "SELECT $__time(time_column), avg(value_column) FROM catalog.default.table_name WHERE $__timeFilter(time_column) GROUP BY $__timeWindow(time_column)",
        rawSqlSelected: true,
    },
    {
        title: 'Time From/To',
        expression: 'SELECT time_column, value_column FROM catalog.default.table_name WHERE time_column BETWEEN $__timeFrom AND $__timeTo',
        label: 'Insert Time range filters from and to time values.',
        rawSqlQuery: "SELECT time_column, value_column FROM catalog.default.table_name WHERE time_column BETWEEN $__timeFrom AND $__timeTo",
        resultingQuery: "SELECT time_column, value_column  FROM catalog.default.table_name WHERE time_column BETWEEN '2021-12-31 23:00:00' AND '2022-01-01 22:59:59'",
        rawSqlSelected: true,
    },
];


type Props = QueryEditorHelpProps<MyQuery>;
export function QueryEditorHelp(props: Props) {
    return (
        <div>
            <h2>SQL Query Documentation</h2>
            <h3>Macros</h3>
            {examples.map((item, index) => (
                <div className="cheat-sheet-item" key={index}>
                    <div className="cheat-sheet-item__title">{item.title}</div>
                    {item.expression ? (
                        <div
                            className="cheat-sheet-item__example"
                            onClick={(e) => props.onClickExample({ rawSqlQuery: item.rawSqlQuery, rawSqlSelected: item.rawSqlSelected } as MyQuery)}
                        >
                            <code>{item.expression}</code>
                        </div>
                    ) : null}
                    <div className="cheat-sheet-item__label" style={{margin: "16px 0 8px 0"}}>{item.label}</div>
                    {item.resultingQuery && (<code>{item.resultingQuery}</code>)}
                </div>
            ))}
        </div>
    );
};
