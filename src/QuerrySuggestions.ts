import {CodeEditorSuggestionItem, CodeEditorSuggestionItemKind} from "@grafana/ui";
import {DataSource} from "./datasource";

const keywords = [
    "ANALYZE TABLE",
    "COMMENT ON",
    "CONVERT",
    "DESC",
    "DESCRIBE",
    "EXPLAIN",
    "FROM",
    "GENERATE",
    "IN",
    "LIST",
    "LIMIT",
    "ORDER BY",
    "REFRESH",
    "SELECT",
    "SHOW",
    "USE",
    "WHERE",
    "WITH"
]

const templateVariables = [
    "$__timeFilter(",
    "$__timeWindow(",
    "$__timeFrom()",
    "$__timeTo()",
    "${__from}",
    "${__from:date}",
    "${__from:date:iso}",
    "${__from:date:seconds}",
    "${__to}",
    "${__to:date}",
    "${__to:date:iso}",
    "${__to:date:seconds}",
    "${__interval}",
    "${__interval_ms}"
]

const functions = [
    "avg()",
    "count()",
    "min()",
    "max()",
    "sum()",
    "round()",
    "ceil()",
    "floor()",
]

interface Column {
    name: string
    type: string
}
interface Suggestions {
    keywords: string[]
    templateVariables: string[]
    functions: string[]
    catalogs: string[]
    schemas: string[]
    tables: string[]
    columns: Column[]
}

export class QuerrySuggestions {
    public suggestions: Suggestions = {
        keywords: [],
        templateVariables: [],
        functions: [],
        catalogs: [],
        schemas: [],
        tables: [],
        columns: [],
    }
    private dataSource: DataSource;

    private loadedSchemas: string[] = [];
    private loadedTables: string[] = [];

    private fetchedTableColumns = "";

    private suggestColumns = false;
    private suggestTables = false;

    constructor(dataSource: DataSource) {
        console.log('QuerrySuggestions Object Created', dataSource.id)
        this.suggestions.keywords = keywords;
        this.suggestions.templateVariables = templateVariables;
        this.suggestions.functions = functions;
        this.dataSource = dataSource;
        this.catalogSchemaTableInit()
    }

    // private matchIndexToPosition(value: string, index: number): {lineNumber: number, column: number} {
    //     let lineNumber = 0;
    //     let columnNumber = 0;
    //     for (let i = 0; i < index; i++) {
    //         if (value[i] == '\n') {
    //             lineNumber++;
    //             columnNumber = 0;
    //         } else {
    //             columnNumber++;
    //         }
    //     }
    //     return {lineNumber: lineNumber, column: columnNumber};
    // }

    private positionToIndex(value: string, position: {lineNumber: number, column: number}): number {
        let index = 0;
        for (let i = 1; i < position.lineNumber; i++) {
            index = value.indexOf('\n', index) + 1;
        }
        index += position.column - 1;
        return index;
    }

    private checkCursorPos(value: string, cursorPosition: {lineNumber: number, column: number}): void {
        // If the cursor is between SELECT and FROM, then suggest columns
        this.suggestColumns = false;
        this.suggestTables = false;
        const pattern = new RegExp("select\\s+([\\w,\\s]*)\\s+from", "i");
        let match = pattern.exec(value);
        let matchIndex = 0;
        while (match !== null) {
            // Check if the cursor is between SELECT and FROM
            const select = match[1];
            const selectLength = select.length;
            const selectIndex = match.index + 7 + matchIndex;
            const cursorIndex = this.positionToIndex(value, cursorPosition);
            if (cursorIndex >= selectIndex && cursorIndex <= selectIndex + selectLength) {
                // Get the table from the query after the cursor
                const patternTable = new RegExp("from\\s+([\\w\.]+)", "i");
                const matchTable = patternTable.exec(value.substring(cursorIndex));
                if (matchTable) {
                    const table = matchTable[1];
                    this.getColumns(table);
                    this.suggestColumns = true;
                    break;
                }
            }
            matchIndex += match.index + match[0].length;
            match = pattern.exec(value.substring(matchIndex));
        }

        // If the cursor is after FROM, then suggest tables
        const patternFrom = new RegExp("from\\s+([\\w\.]*)", "i");
        let matchFrom = patternFrom.exec(value);
        let regexIndex = 0;
        while (matchFrom !== null) {
            const from = matchFrom[1];
            const fromLength = from.length;
            const fromIndex = matchFrom.index + 5 + regexIndex;
            const cursorIndex = this.positionToIndex(value, cursorPosition);
            if (cursorIndex >= fromIndex && cursorIndex <= fromIndex + fromLength) {
                const patternCatalog = new RegExp("from\\s+(\\w+)\\.", "i");
                const matchCatalog = patternCatalog.exec(value.substring(regexIndex));

                if (matchCatalog) {
                    const catalog = matchCatalog[1];
                    this.getSchemas(catalog)

                    const patternSchema = new RegExp("from\\s+\\w+\\.(\\w+)\\.", "i");
                    const matchSchema = patternSchema.exec(value.substring(regexIndex));

                    if (matchSchema) {
                        const schema = matchSchema[1];
                        this.getTables(catalog, schema)
                    }
                }
                this.suggestTables = true;
                break;
            }
            regexIndex += matchFrom.index + matchFrom[0].length;
            matchFrom = patternFrom.exec(value.substring(regexIndex));
        }
    }
    public updateSuggestions(value: string, cursorPosition: {lineNumber: number, column: number}): void {
        this.checkCursorPos(value, cursorPosition);
    }

    private async catalogSchemaTableInit() {
        this.dataSource.postResource("catalogs", {}).then((catalogs) => {
            this.suggestions.catalogs = catalogs;
        })
        this.dataSource.postResource("schemas", {}).then((schemas) => {
            this.suggestions.schemas = schemas;
        })
        this.dataSource.postResource("tables", {}).then((tables) => {
            this.suggestions.tables = tables;
        })
    }

    private async getColumns(table: string): Promise<void> {
        if (this.fetchedTableColumns === table) {
            return;
        }
        this.fetchedTableColumns = table;
        this.dataSource.postResource("columns", {table: table}).then((columns) => {
            this.suggestions.columns = columns;
        })
    }

    public async getSchemas(catalog: string): Promise<void> {
        if (this.loadedSchemas.includes(catalog)) {
            return;
        }
        this.loadedSchemas.push(catalog);
        this.dataSource.postResource("schemas", {catalog: catalog}).then((schemas) => {
            schemas.forEach((schema: string) => {
                this.suggestions.schemas.push(catalog + "." + schema);
            });
        })
    };

    public async getTables(catalog: string, schema: string): Promise<void> {
        if (this.loadedTables.includes(catalog + "." + schema)) {
            return;
        }
        this.loadedTables.push(catalog + "." + schema);
        this.dataSource.postResource("tables", {catalog: catalog, schema: schema}).then((tables) => {
            tables.forEach((table: string) => {
                this.suggestions.tables.push(catalog + "." + schema + "." + table);
            });
        })
    }

    public getSuggestions(): CodeEditorSuggestionItem[] {
        const suggestionsResponse: CodeEditorSuggestionItem[] = [];
        this.suggestions.keywords.forEach((keyword) => {
            suggestionsResponse.push({
                label: keyword,
                kind: CodeEditorSuggestionItemKind.Text,
                detail: "Keyword",
            })
        });
        this.suggestions.functions.forEach((func) => {
            suggestionsResponse.push({
                label: func,
                kind: CodeEditorSuggestionItemKind.Property,
                detail: "Function",
            })
        });
        this.suggestions.templateVariables.forEach((templateVar) => {
            suggestionsResponse.push({
                label: templateVar,
                kind: CodeEditorSuggestionItemKind.Constant,
                detail: "Template Variable",
            })
        });
        if (this.suggestTables) {
            this.suggestions.catalogs.forEach((catalog) => {
                suggestionsResponse.push({
                    label: catalog,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Catalog",
                })
            });
            this.suggestions.schemas.forEach((schema) => {
                suggestionsResponse.push({
                    label: schema,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Schema",
                })
            });
            this.suggestions.tables.forEach((table) => {
                suggestionsResponse.push({
                    label: table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                })
            });
        }
        if (this.suggestColumns) {
            this.suggestions.columns.forEach((column) => {
                suggestionsResponse.push({
                    label: column.name,
                    kind: CodeEditorSuggestionItemKind.Field,
                    detail: column.type,
                    documentation: 'Column'
                })
            });
        }
        return suggestionsResponse;
    }
}
