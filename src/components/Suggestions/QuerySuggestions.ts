import {CodeEditorSuggestionItem, CodeEditorSuggestionItemKind} from "@grafana/ui";
import {DataSource} from "../../datasource";
import {
    Clause,
    defaultSuggestionConfig,
    functions,
    templateVariables
} from "./constants";
import {Suggestions} from "../../types";
import {positionToIndex} from "./utils";

type ClauseSuggestionsType = {
    [clause in Clause]: CodeEditorSuggestionItem[]
}

interface ConstantSuggestions {
    templateVariables: CodeEditorSuggestionItem[]
    functions: CodeEditorSuggestionItem[]
}
export class QuerySuggestions {
    public suggestions: Suggestions = {
        catalogs: [],
        schemas: [],
        tables: [],
        columns: [],
    }
    private clauseSuggestions: ClauseSuggestionsType = {
        "START": [],
        "SELECT": [],
        "USE": [],
        "FROM": [],
        "WHERE": [],
        "GROUP BY": [],
        "ORDER BY": [],
    }
    private constantSuggestions: ConstantSuggestions = {
        templateVariables: [],
        functions: [],
    }
    private dataSource: DataSource;

    private loadedSchemas: string[] = [];
    private loadedTables: string[] = [];

    private fetchedTableColumns = "";

    private currentClause = "";
    private currentClauseIndex = 0;

    private currentCatalog = "hive_metastore";
    private currentSchema = "default";

    private tableSuggestions: CodeEditorSuggestionItem[] = [];
    private columnSuggestions: CodeEditorSuggestionItem[] = [];

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.initConstantSuggestions();
        this.catalogSchemaTableInit();
    }

    private initConstantSuggestions(): void {
        this.constantSuggestions.functions = functions.map((func) => {
            return {
                label: func + "()",
                kind: CodeEditorSuggestionItemKind.Property,
                detail: "Function",
                insertText: func + "(${0})",
                // @ts-ignore
                insertTextRules: 4
            }
        });
        this.constantSuggestions.templateVariables = templateVariables.map((templateVar) => {
            return {
                label: templateVar,
                kind: CodeEditorSuggestionItemKind.Constant,
                detail: "Template Variable",
            }
        });
        // Special template variables with insertText
        this.constantSuggestions.templateVariables.push({
            label: "$__timeFilter(timeColumn)",
            kind: CodeEditorSuggestionItemKind.Constant,
            detail: "Template Variable",
            insertText: "\\\$__timeFilter(${0:timeColumn})",
            // @ts-ignore
            insertTextRules: 4
        });
        this.constantSuggestions.templateVariables.push({
            label: "$__timeWindow(timeColumn)",
            kind: CodeEditorSuggestionItemKind.Constant,
            detail: "Template Variable",
            insertText: "\\\$__timeWindow(${1:timeColumn})",
            // @ts-ignore
            insertTextRules: 4
        });
    }

    private getCursorPositionClause(value: string, cursorPosition: {lineNumber: number, column: number}): {clause: string, index: number} {
        // Get the current clause based on the cursor position
        const clausePattern = new RegExp("(select|use|from|where|group by|order by|\\s\\(|;)(?![\\s\\S]*(select|use|from|where|group by|order by|\\s\\(|;))", "i");
        const cursorIndex = positionToIndex(value, cursorPosition);
        const match = clausePattern.exec(value.substring(0, cursorIndex));
        if (match !== null) {
            const clause = match[1].includes("(") || match[1].includes(";") ? "START" : match[1];
            return {
                clause: clause,
                index: match.index
            };
        }
        return {
            clause: "START",
            index: 0
        };
    }

    private checkMetaDataRefresh(value: string, cursorPosition: {lineNumber: number, column: number}): void {
        // Check if fetch of catalog/schema/table/column metadata from databricks is needed

        const cursorIndex = positionToIndex(value, cursorPosition);
        const matchIndex = this.currentClause === "SELECT" ? cursorIndex : this.currentClauseIndex;
        const pattern = new RegExp("from\\s+([\\w\.]+)", "i");
        const match = pattern.exec(value.substring(matchIndex));
        if (match) {
            const dotCount = (match[1].match(/\./g) || []).length;
            let catalog = this.currentCatalog;
            let schema = this.currentSchema;
            let table = match[1];
            if (dotCount === 0) {
                if (this.loadedTables.includes(catalog + "." + schema)) {
                    this.getColumns(catalog + "." + schema + "." + table);
                } else {
                    // Try if string is catalog or schema, in case USE clause is used or default schema/catalog is used
                    this.getSchemas(table);
                    this.getTables(catalog, table);
                }
            }
            if (dotCount === 1) {
                schema = match[1].split(".")[0];
                table = match[1].split(".")[1];
                if (this.loadedTables.includes(catalog + "." + schema)) {
                    this.getTables(catalog, schema).then(() => {
                        this.getColumns(catalog + "." + schema + "." + table);
                    });
                } else {
                    // Try if first string is schema, in case USE clause is used or default catalog is used
                    this.getSchemas(schema);
                    this.getTables(schema, table);
                }
            }
            if (dotCount === 2) {
                catalog = match[1].split(".")[0];
                schema = match[1].split(".")[1];
                table = match[1].split(".")[2];
                if (this.loadedTables.includes(catalog + "." + schema)) {
                    this.getTables(catalog, schema).then(() => {
                        this.getColumns(catalog + "." + schema + "." + table);
                    });
                }
            }
        }
    }

    private rebuildClauseSuggestions(): void {
        for (const clauseKey of Object.values(Clause)) {
            this.clauseSuggestions[clauseKey] = []
            // Keywords
            defaultSuggestionConfig[clauseKey].keywords.forEach((keyword) => {
                this.clauseSuggestions[clauseKey].push({
                    label: keyword,
                    kind: CodeEditorSuggestionItemKind.Text,
                    detail: "Keyword",
                })
            });
            // Template Variables
            if (defaultSuggestionConfig[clauseKey].templateVariables) {
                this.clauseSuggestions[clauseKey] = this.clauseSuggestions[clauseKey].concat(this.constantSuggestions.templateVariables);
            }
            // Functions
            if (defaultSuggestionConfig[clauseKey].functions) {
                this.clauseSuggestions[clauseKey] = this.clauseSuggestions[clauseKey].concat(this.constantSuggestions.functions);
            }
            // Tables
            if (defaultSuggestionConfig[clauseKey].tables) {
                this.clauseSuggestions[clauseKey] = this.clauseSuggestions[clauseKey].concat(this.tableSuggestions);
            }
            // Columns
            if (defaultSuggestionConfig[clauseKey].columns) {
                this.clauseSuggestions[clauseKey] = this.clauseSuggestions[clauseKey].concat(this.columnSuggestions);
            }
        }
    }
    public updateSuggestions(value: string, cursorPosition: {lineNumber: number, column: number}): void {
        const currentClauseResponse = this.getCursorPositionClause(value, cursorPosition);
        this.currentClause = currentClauseResponse.clause.toUpperCase();
        this.currentClauseIndex = currentClauseResponse.index;
        this.checkUseClause(value);

        // Check if metadata refresh is needed of catalog/schema/table/column
        if (this.currentClause === "SELECT" || this.currentClause === "FROM") {
            this.checkMetaDataRefresh(value, cursorPosition);
        }
    }

    private checkUseClause(value: string): void {
        // Check if USE clause is used and update the default catalog/schema if needed

        const patternCatalog = new RegExp("use\\s+catalog\\s+(\\w+)", "i");
        const matchCatalog = patternCatalog.exec(value);
        if (matchCatalog) {
            const catalog = matchCatalog[1];
            if (this.suggestions.catalogs.includes(catalog)) {
                this.currentCatalog = catalog;
                this.getSchemas(catalog);
            }
        }

        const patternSchema = new RegExp("use\\s+(?!.*catalog)(schema\\s+|database\\s+)?([\\w\.]+)", "i");
        const matchSchema = patternSchema.exec(value);
        if (matchSchema) {
            let schema = matchSchema[2];
            if (schema.includes(".")) {
                const catalog = schema.split(".")[0];
                schema = schema.split(".")[1];
                if (this.suggestions.catalogs.includes(catalog)) {
                    this.currentCatalog = catalog;
                    this.getSchemas(catalog);
                }
            }
            if (this.suggestions.schemas.includes(schema)) {
                this.currentSchema = schema;
                this.getTables(this.currentCatalog, schema);
            }
        }
    }

    private async catalogSchemaTableInit() {

        await this.dataSource.postResource("defaults", {}).then((defaults: {defaultCatalog: string, defaultSchema: string}) => {
            this.currentCatalog = defaults.defaultCatalog;
            this.currentSchema = defaults.defaultSchema;
        }).catch((error) => {
            console.log(error);
        });

        this.dataSource.postResource("catalogs", {}).then((catalogs) => {
            this.suggestions.catalogs = catalogs;
            this.suggestions.catalogs.forEach((catalog) => {
                this.tableSuggestions.push({
                    label: catalog,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Catalog",
                })
            })
        }).catch((error) => {
            console.log(error);
        })
        this.dataSource.postResource("schemas", {catalog: this.currentCatalog}).then((schemas) => {
            this.suggestions.schemas = schemas;
            this.suggestions.schemas.forEach((schema) => {
                this.tableSuggestions.push({
                    label: this.currentCatalog + '.' + schema,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Schema",
                })
            })
        }).catch((error) => {
            console.log(error);
        })
        this.dataSource.postResource("tables", {catalog: this.currentCatalog, schema: this.currentSchema}).then((tables) => {
            this.suggestions.tables = tables;
            this.suggestions.tables.forEach((table) => {
                this.tableSuggestions.push({
                    label: this.currentCatalog + '.' + this.currentSchema + '.' + table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                })
            })
        }).catch((error) => {
            console.log(error);
        })

        this.rebuildClauseSuggestions();
    }

    private async getColumns(table: string): Promise<void> {
        if (this.fetchedTableColumns === table) {
            return;
        }
        if (!this.suggestions.tables.includes(table)) {
            return;
        }
        this.fetchedTableColumns = table;
        this.dataSource.postResource("columns", {table: table}).then((columns) => {
            this.suggestions.columns = columns;
            this.columnSuggestions = this.suggestions.columns.map((column): CodeEditorSuggestionItem => {
                return {
                    label: column.name,
                    kind: CodeEditorSuggestionItemKind.Field,
                    detail: column.type,
                    documentation: 'Column'
                }
            })
            this.rebuildClauseSuggestions();
        }).catch((error) => {
            console.log(error);
        })
    }

    public async getSchemas(catalog: string): Promise<void> {
        if (this.loadedSchemas.includes(catalog)) {
            return;
        }
        if (!this.suggestions.catalogs.includes(catalog)) {
            return;
        }
        this.loadedSchemas.push(catalog);
        this.dataSource.postResource("schemas", {catalog: catalog}).then((schemas) => {
            schemas.forEach((schema: string) => {
                this.suggestions.schemas.push(catalog + "." + schema);
                this.suggestions.schemas.push(schema);
                this.tableSuggestions.push({
                    label: catalog + "." + schema,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Schema",
                });
                this.tableSuggestions.push({
                    label: schema,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Schema",
                });
                this.rebuildClauseSuggestions();
            });
        }).catch((error) => {
            console.log(error);
        })
    };

    public async getTables(catalog: string, schema: string): Promise<void> {
        if (this.loadedTables.includes(catalog + "." + schema)) {
            return;
        }
        if (!this.suggestions.schemas.includes(catalog + "." + schema)) {
            return;
        }
        this.loadedTables.push(catalog + "." + schema);
        this.dataSource.postResource("tables", {catalog: catalog, schema: schema}).then((tables) => {
            tables.forEach((table: string) => {
                this.suggestions.tables.push(catalog + "." + schema + "." + table);
                this.suggestions.tables.push(schema + "." + table);
                this.suggestions.tables.push(table);
                this.tableSuggestions.push({
                    label: catalog + "." + schema + "." + table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                });
                this.tableSuggestions.push({
                    label: schema + "." + table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                });
                this.tableSuggestions.push({
                    label: table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                });
                this.rebuildClauseSuggestions();
            });
        }).catch((error) => {
            console.log(error);
        })
    }

    public getSuggestions(): CodeEditorSuggestionItem[] {
        if (this.currentClause in Clause) {
            return this.clauseSuggestions[this.currentClause as Clause];
        }
        return [];
    }
}
