import {
    ColumnDefinition,
    CompletionItemKind,
    getStandardSQLCompletionProvider,
    LanguageCompletionProvider,
    LinkedToken,
    PositionContext,
    StatementPlacementProvider,
    SuggestionKindProvider,
    TableIdentifier,
    TokenType
} from '@grafana/experimental';
import {DB, SQLQuery} from 'components/grafana-sql/src';
import {functions, macros} from "./components/Suggestions/constants";

interface CustomCompletionDefinition {
    label: string;
    detail?: string;
    kind?: CompletionItemKind;
    command?: {
        id: string;
        title: string;
    };
}

interface CompletionProviderGetterArgs {
    getColumns: React.MutableRefObject<(t: SQLQuery) => Promise<ColumnDefinition[]>>;
    getSuggestions: React.MutableRefObject<(value: string) => Promise<CustomCompletionDefinition[]>>;
}

const customStatementPlacement = {
    catalogSchmeaTable: 'catalogSchemaTable',
};

const customSuggestionKind = {
    catalogSchemaTable: 'catalogSchemaTable',
};

const FROMKEYWORD = 'FROM';

export const customStatementPlacementProvider: StatementPlacementProvider = () => [
    {
        id: customStatementPlacement.catalogSchmeaTable,
        resolve: (currentToken, previousKeyword, previousNonWhiteSpace) => {
            return Boolean(
                (currentToken?.is(TokenType.Whitespace, ' ') &&
                    previousKeyword?.value === FROMKEYWORD &&
                    currentToken
                        ?.getPreviousUntil(TokenType.Keyword, [TokenType.IdentifierQuote], FROMKEYWORD)
                        ?.filter((t) => t.isIdentifier()).length === 0) || (
                    currentToken?.isIdentifier() &&
                    previousKeyword?.value === FROMKEYWORD &&
                    currentToken
                        ?.getPreviousUntil(TokenType.Keyword, [TokenType.IdentifierQuote], FROMKEYWORD)
                        ?.filter((t) => t.isIdentifier()).length === 0 && splitCatalogSchemaTable(currentToken.value) <= 2
                )
            );
        },
    },
];

export const customSuggestionKinds: (args: CompletionProviderGetterArgs) => SuggestionKindProvider =
    ({getSuggestions}) => () => [
        {
            id: customSuggestionKind.catalogSchemaTable,
            applyTo: [customStatementPlacement.catalogSchmeaTable],
            suggestionsResolver: async (ctx: PositionContext) => {
                return await getSuggestions.current(ctx.currentToken?.value || '');
            },
        }
    ];

export const getSqlCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
    ({getColumns, getSuggestions}) =>
        (monaco, language) => ({
            ...(language && getStandardSQLCompletionProvider(monaco, language)),
            supportedFunctions: () => functions.map((functionName, index) => {
                return {
                    id: functionName,
                    name: functionName,
                    description: `Function ${functionName}`,
                };
            }),
            customSuggestionKinds: customSuggestionKinds({getColumns, getSuggestions}),
            customStatementPlacement: customStatementPlacementProvider,
            supportedMacros: () => macros,
            columns: {
                resolve: async (t?: TableIdentifier) => {
                    return await getColumns.current({table: t?.table, refId: 'A'});
                },
            },
            tables: {
                resolve: async (t: TableIdentifier | null) => {
                    return [];
                },
                parseName: (token: LinkedToken | null | undefined): TableIdentifier => {
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

export async function fetchSuggestions(value: String, db: DB) {
    const split = value.split('.').filter((t) => t.length > 0);
    const suggestions = [];

    if (value === '' || value === ' ') {
        suggestions.push(...await fetchCatalogSuggestions(db));
        suggestions.push(...await fetchSchemaSuggestions(db, undefined));
        suggestions.push(...await fetchTableSuggestions(db, undefined, undefined));
    } else if (split.length === 1) {
        suggestions.push(...await fetchSchemaSuggestions(db, split[0]));
        suggestions.push(...await fetchTableSuggestions(db, undefined, split[0]));
    } else if (split.length === 2) {
        suggestions.push(...await fetchTableSuggestions(db, split[0], split[1]));
    }

    return suggestions;
}

async function fetchCatalogSuggestions(db: DB) {
    const catalogs = await db.catalogs();
    return catalogs.map(catalog => ({
        label: `${catalog}.`,
        detail: 'Catalog',
        kind: CompletionItemKind.Field,
        command: {id: 'editor.action.triggerSuggest', title: ''}
    }));
}

async function fetchSchemaSuggestions(db: DB, catalog: string | undefined) {
    const schemas = await db.schemas(catalog);
    return schemas.map(schema => ({
        label: `${schema}.`,
        detail: 'Schema',
        kind: CompletionItemKind.Field,
        command: {id: 'editor.action.triggerSuggest', title: ''}
    }));
}

async function fetchTableSuggestions(db: DB, catalog: string | undefined, schema: string | undefined) {
    const tables = await db.tables(catalog, schema);
    return tables.map(table => ({
        label: table,
        detail: 'Table',
        kind: CompletionItemKind.Field
    }));
}

function splitCatalogSchemaTable(token: string): number {
    // check if token has at least one dot
    if (token.indexOf('.') === -1) {
        return 0;
    }
    return token.split('.').filter((t) => t.length > 0).length;
}

function splitCatalogSchemaTableNames(token: string): {
    catalog: string | undefined,
    schema: string | undefined,
    table: string | undefined
} {
    const split = token.split('.').filter((t) => t.length > 0)
    if (split.length === 1) {
        return {catalog: undefined, schema: undefined, table: split[0]};
    }
    if (split.length === 2) {
        return {catalog: undefined, schema: split[0], table: split[1]};
    }
    if (split.length === 3) {
        return {catalog: split[0], schema: split[1], table: split[2]};
    }
    return {catalog: undefined, schema: undefined, table: undefined};
}

export async function fetchColumns(db: DB, q: SQLQuery) {
    const {catalog, schema, table} = splitCatalogSchemaTableNames(q.table || '')
    const cols = await db.fields(catalog, schema, table);
    return cols.length > 0 ? cols.map(c => ({name: c.label || "", type: c.raqbFieldType, description: c.type})) : [];
}