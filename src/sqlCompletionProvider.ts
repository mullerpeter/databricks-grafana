import {
  ColumnDefinition,
  getStandardSQLCompletionProvider,
  LanguageCompletionProvider, LinkedToken, SchemaDefinition,
  TableDefinition,
  TableIdentifier
} from '@grafana/experimental';
import { DB, SQLQuery } from 'components/grafana-sql/src';

interface CompletionProviderGetterArgs {
  getColumns: React.MutableRefObject<(t: SQLQuery) => Promise<ColumnDefinition[]>>;
  getTables: React.MutableRefObject<(t: SQLQuery) => Promise<TableDefinition[]>>;
  getSchemas: React.MutableRefObject<(t: SQLQuery) => Promise<SchemaDefinition[]>>;
}

export const getSqlCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
  ({ getColumns, getTables, getSchemas }) =>
  (monaco, language) => ({
    ...(language && getStandardSQLCompletionProvider(monaco, language)),
    tables: {
      resolve: async (t: TableIdentifier | null) => {
        return await getTables.current({ schema: t?.schema, refId: 'A' });
      },
      parseName: (token: LinkedToken | null | undefined): TableIdentifier  => {
        if (!token) {
          return {schema: undefined, table: undefined};
        }
        const split = token?.value.split('.');
        const len = split?.length;
        if (len === 1) {
          return {schema: undefined, table: split[0]};
        } else if (len === 2) {
          return {schema: split[0], table: split[1] || undefined};
        } else if (len === 3) {
          return {schema: `${split[0]}.${split[1]}`, table: split[2] || undefined};
        }
        return {schema: undefined, table: undefined};
      }
    },
    schemas: {
        resolve: async () => {
            return await getSchemas.current({ refId: 'A' });
        },
    },
    columns: {
      resolve: async (t?: TableIdentifier) => {
        return await getColumns.current({ table: t?.table, schema: t?.schema, refId: 'A' });
      },
    },
  });

export async function fetchColumns(db: DB, q: SQLQuery) {
  let [catalog, schema] = q.schema?.split('.') || [undefined, undefined];
  if (catalog && !schema) {
    schema = catalog;
    catalog = undefined;
  }
  const cols = await db.fields(catalog, schema, q.table);
  return cols.length > 0 ? cols.map(c => ({ name: c.label || "", type: c.raqbFieldType, description: c.type })) : [];
}

export async function fetchTables(db: DB, query: SQLQuery) {
  let [catalog, schema] = query.schema?.split('.') || [undefined, undefined];
  if (catalog && !schema) {
    schema = catalog;
    catalog = undefined;
  }
  const tables = await db.tables(catalog, schema);
  return tables.length > 0 ? tables.map(t => ({ name: t, completion: t })) : [];
}

export async function fetchSchemas(db: DB, query: SQLQuery) {
  const catalogs = await db.catalogs();
  let schemas: string[] = [];
  for (const catalog of catalogs) {
    const schemas_catalog = await db.schemas(catalog);
    schemas = schemas.concat(schemas_catalog.map((s) => `${catalog}.${s}`));
  }
  return schemas.length > 0 ? schemas.map(schema => ({ name: schema, completion: schema })) : [];
}
