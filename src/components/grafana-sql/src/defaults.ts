import { EditorMode } from '@grafana/experimental';

import { QueryFormat, SQLQuery } from './types';
import { createFunctionField, setGroupByField } from './utils/sql.utils';

export function applyQueryDefaults(q?: SQLQuery): SQLQuery {
  // Migrate rawSqlQuery to rawSql, to support legacy queries.
  if (q?.rawSql === undefined && q?.rawSqlQuery !== undefined) {
    q.rawSql = q.rawSqlQuery;
    q.rawSqlQuery = undefined;
  }

  let editorMode = q?.editorMode || EditorMode.Builder;

  // Switching to code editor if the query was created before visual query builder was introduced.
  if (q?.editorMode === undefined && q?.rawSql !== undefined) {
    editorMode = EditorMode.Code;
  }

  const result: SQLQuery = {
    ...q,
    refId: q?.refId || 'A',
    format: q?.format !== undefined ? q.format : QueryFormat.Table,
    rawSql: q?.rawSql || '',
    rawSqlQuery: q?.rawSqlQuery,
    editorMode,
    sql: q?.sql ?? {
      columns: [createFunctionField()],
      groupBy: [setGroupByField()],
      limit: 50,
    },
  };

  return result;
}

export type QueryWithDefaults = ReturnType<typeof applyQueryDefaults>;
