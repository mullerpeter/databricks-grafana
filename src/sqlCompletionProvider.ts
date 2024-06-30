import {
    ColumnDefinition, CompletionItemKind,
    getStandardSQLCompletionProvider,
    LanguageCompletionProvider,
    LinkedToken, PositionContext,
    StatementPlacementProvider, SuggestionKind,
    SuggestionKindProvider,
    TableIdentifier,
    TokenType
} from '@grafana/experimental';
import { DB, SQLQuery } from 'components/grafana-sql/src';
import {functions, macros} from "./components/Suggestions/constants";

interface CustomCatalogDefinition {
    label: string;
    detail?: string;
    kind?: CompletionItemKind;
}

interface CustomSchemaDefinition {
    label: string;
    detail?: string;
    kind?: CompletionItemKind;
}

interface CustomTableDefinition {
    label: string;
    detail?: string;
    kind?: CompletionItemKind;
}

interface CompletionProviderGetterArgs {
  getColumns: React.MutableRefObject<(t: SQLQuery) => Promise<ColumnDefinition[]>>;
  getTables: React.MutableRefObject<(t: SQLQuery) => Promise<CustomTableDefinition[]>>;
  getSchemas: React.MutableRefObject<(t: SQLQuery) => Promise<CustomSchemaDefinition[]>>;
  getCatalogs: React.MutableRefObject<(t: SQLQuery) => Promise<CustomCatalogDefinition[]>>;
}

const customStatementPlacement = {
    catalog: 'catalog',
    afterCatalog: 'afterCatalog',
    afterSchema: 'afterSchema',
};

const customSuggestionKind = {
    catalog: 'catalog',
    schema: 'schema_databricks',
    table: 'table_databricks',
};

const FROMKEYWORD = 'FROM';

export const customStatementPlacementProvider: StatementPlacementProvider = () => [
    {
        id: customStatementPlacement.catalog,
        resolve: (currentToken, previousKeyword, previousNonWhiteSpace) => {
            return Boolean(
                currentToken?.is(TokenType.Whitespace, ' ') &&
                previousKeyword?.value === FROMKEYWORD &&
                currentToken
                    ?.getPreviousUntil(TokenType.Keyword, [TokenType.IdentifierQuote], FROMKEYWORD)
                    ?.filter((t) => t.isIdentifier()).length === 0
            );
        },
    },
    {
        id: customStatementPlacement.afterCatalog,
        resolve: (currentToken, previousKeyword, previousNonWhiteSpace) => {
           return Boolean(
                currentToken?.isIdentifier() &&
                previousKeyword?.value === FROMKEYWORD &&
                currentToken
                    ?.getPreviousUntil(TokenType.Keyword, [TokenType.IdentifierQuote], FROMKEYWORD)
                    ?.filter((t) => t.isIdentifier()).length === 0 && splitCatalogSchemaTable(currentToken.value) === 1
            );
        },
    },
    {
        id: customStatementPlacement.afterSchema,
        resolve: (currentToken, previousKeyword, previousNonWhiteSpace) => {
            return Boolean(
                currentToken?.isIdentifier() &&
                previousKeyword?.value === FROMKEYWORD &&
                currentToken
                    ?.getPreviousUntil(TokenType.Keyword, [TokenType.IdentifierQuote], FROMKEYWORD)
                    ?.filter((t) => t.isIdentifier()).length === 0 && splitCatalogSchemaTable(currentToken.value) === 2
            );
        },
    }
];

export const customSuggestionKinds: (args: CompletionProviderGetterArgs) => SuggestionKindProvider =
    ({ getCatalogs, getSchemas, getTables }) => () => [
        {
            id: customSuggestionKind.catalog,
            applyTo: [customStatementPlacement.catalog],
            suggestionsResolver: async () => {
                const catatlogs = await getCatalogs.current({ refId: 'A' });
                return catatlogs;
            },
        },
        {
            id: customSuggestionKind.schema,
            applyTo: [customStatementPlacement.afterCatalog],
            suggestionsResolver: async (ctx: PositionContext) => {
                const catalogName = getCatalogName(ctx.currentToken);
                return await getSchemas.current({ catalog: catalogName, refId: 'A' });
            },
        },
        {
            id: customSuggestionKind.table,
            applyTo: [customStatementPlacement.afterSchema],
            suggestionsResolver: async (ctx: PositionContext) => {
                const catalogName = getCatalogName(ctx.currentToken);
                const schemaName = getSchemaName(ctx.currentToken);
                return await getTables.current({ catalog: catalogName, schema: schemaName, refId: 'A' });
            },
        },
        {
            id: SuggestionKind.Schemas,
            overrideDefault: true,
            suggestionsResolver: async () => {
                return [];
            },
        },
        {
            id: SuggestionKind.Tables,
            overrideDefault: true,
            suggestionsResolver: async () => {
                return [];
            },
        },
    ];

export const getSqlCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
  ({ getColumns, getTables, getSchemas, getCatalogs }) =>
  (monaco, language) => ({
    ...(language && getStandardSQLCompletionProvider(monaco, language)),
    supportedFunctions: () => functions.map((functionName, index) => {
        return {
            id: functionName,
            name: functionName,
            description: `Function ${functionName}`,
        };
    }),
    customSuggestionKinds: customSuggestionKinds({ getColumns, getTables, getSchemas, getCatalogs }),
    customStatementPlacement: customStatementPlacementProvider,
    supportedMacros: () => macros,
    columns: {
      resolve: async (t?: TableIdentifier) => {
        return await getColumns.current({ table: t?.table, refId: 'A' });
      },
    },
      tables: {
          resolve: async (t: TableIdentifier | null) => {
              return [];
          },
          parseName: (token: LinkedToken | null | undefined): TableIdentifier  => {
              if (!token) {
                  return {table: undefined};
              }
              return {table: token?.value};
          }
      },
      schemas: {
          resolve: async () => {
              return [];
          },
      },
  });

function splitCatalogSchemaTable(token: string): number {
    // check if token has at least one dot
    if (token.indexOf('.') === -1) {
        return 0;
    }
    return token.split('.').filter((t) => t.length > 0).length;
}

function splitCatalogSchemaTableNames(token: string): { catalog: string | undefined, schema: string| undefined, table: string | undefined} {
   const split =  token.split('.').filter((t) => t.length > 0)
    if (split.length === 1) {
        return { catalog: undefined, schema: undefined, table: split[0] };
    }
    if (split.length === 2) {
        return { catalog: undefined, schema: split[0], table: split[1] };
    }
    if (split.length === 3) {
        return {catalog: split[0], schema: split[1], table: split[2]};
    }
    return { catalog: undefined, schema: undefined, table: undefined };
}
function getCatalogName(token: LinkedToken | null | undefined) {
    const split = token?.value.split('.');
    if (split) {
        return split[0];
    }
    return undefined;
}

function getSchemaName(token: LinkedToken | null | undefined) {
    const split = token?.value.split('.');
    if (split && split.length >= 2) {
        return split[1];
    }
    return undefined;
}

export async function fetchColumns(db: DB, q: SQLQuery) {
  const { catalog, schema, table } = splitCatalogSchemaTableNames(q.table || '')
  const cols = await db.fields(catalog, schema, table);
  return cols.length > 0 ? cols.map(c => ({ name: c.label || "", type: c.raqbFieldType,description: c.type })) : [];
}

export async function fetchTables(db: DB, query: SQLQuery) {
  const tables = await db.tables(query.catalog, query.schema);
  return tables.length > 0 ? tables.map(t => ({
      label: t,
      detail: 'Table',
      kind: CompletionItemKind.Field
  })) : [];
}

export async function fetchSchemas(db: DB, query: SQLQuery): Promise<CustomSchemaDefinition[]> {
    const schemas = await db.schemas(query.catalog);
    return schemas.length > 0 ? schemas.map(schema => ({
        label: schema,
        detail: 'Schema',
        kind: CompletionItemKind.Field
    })) : [];
}

export async function fetchCatalogs(db: DB, query: SQLQuery): Promise<CustomCatalogDefinition[]> {
    const catalogs = await db.catalogs();
    return catalogs.length > 0 ? catalogs.map(catalog => ({
        label: catalog,
        detail: 'Catalog',
        kind: CompletionItemKind.Field
    })) : [];
}
