import {
  ColumnDefinition,
  getStandardSQLCompletionProvider,
  LanguageCompletionProvider,
  TableDefinition,
  TableIdentifier,
} from '@grafana/experimental';
import { DB, SQLQuery } from 'components/grafana-sql/src';

interface CompletionProviderGetterArgs {
  getColumns: React.MutableRefObject<(t: SQLQuery) => Promise<ColumnDefinition[]>>;
  getTables: React.MutableRefObject<(t: SQLQuery) => Promise<TableDefinition[]>>;
}

export const getSqlCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
  ({ getColumns, getTables }) =>
  (monaco, language) => ({
    ...(language && getStandardSQLCompletionProvider(monaco, language)),
    tables: {
      resolve: async (t: TableIdentifier | null) => {
        return await getTables.current({ schema: t?.schema, refId: 'A' });
      },
    },
    columns: {
      resolve: async (t?: TableIdentifier) => {
        return await getColumns.current({ table: t?.table, schema: t?.schema, refId: 'A' });
      },
    },
  });

export async function fetchColumns(db: DB, q: SQLQuery) {
  const cols = await db.fields(q);
  if (cols.length > 0) {
    return cols.map((c) => {
      return { name: c.label || "", type: c.type, description: c.type };
    });
  } else {
    return [];
  }
}

export async function fetchTables(db: DB, query: SQLQuery) {
  const tables = await db.tables(query.schema);
  if (tables.length > 0) {
    return tables.map((t) => {
      return { name: t, completion: t };
    });
  } else {
    return [];
  }
}
