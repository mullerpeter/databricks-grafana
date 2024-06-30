import {CodeEditorSuggestionItem, CodeEditorSuggestionItemKind} from "@grafana/ui";
import {DatabricksDatasource} from "../../datasource";
import {
    Clause,
    defaultSuggestionConfig,
    functions,
    templateVariables
} from "./constants";
import {Column, Suggestions} from "../../types";
import {getCursorPositionClause, positionToIndex} from "./utils";

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
    private dataSource: DatabricksDatasource;

    private loadedSchemas: string[] = [];
    private loadedTables: string[] = [];

    private fetchedTableColumns = "";
    private tableColumnsCache: Map<string, Column[]> = new Map<string, Column[]>();

    private currentClause = "";
    private currentClauseIndex = 0;

    private currentCatalog: string | undefined = undefined;
    private currentSchema: string | undefined = undefined;

    private tableSuggestions: CodeEditorSuggestionItem[] = [];
    private columnSuggestions: CodeEditorSuggestionItem[] = [];

    private isInitialized = false;

    constructor(dataSource: DatabricksDatasource) {
        this.dataSource = dataSource;
        this.initConstantSuggestions();
    }

    private async initialize(): Promise<void> {
        this.isInitialized = true;
        await this.catalogSchemaTableInit();
    }

    // ts-ignore are used since the grafana-ui types for the suggestions do not contain all the fields of the
    // underlying monaco editor suggestions, additional fields are needed to insert snippets & sort the suggestions
    private initConstantSuggestions(): void {
        this.constantSuggestions.functions = functions.map((func) => {
            return {
                label: func + "()",
                kind: CodeEditorSuggestionItemKind.Property,
                detail: "Function",
                insertText: func + "(${0})",
                // @ts-ignore
                insertTextRules: 4,
                // @ts-ignore
                sortText: "d",
            }
        });
        this.constantSuggestions.templateVariables = templateVariables.map((templateVar) => {
            return {
                label: templateVar,
                kind: CodeEditorSuggestionItemKind.Constant,
                detail: "Template Variable",
                // @ts-ignore
                sortText: "d",
            }
        });
        // Special template variables with insertText
        this.constantSuggestions.templateVariables.push({
            label: "$__timeFilter(timeColumn)",
            kind: CodeEditorSuggestionItemKind.Constant,
            detail: "Template Variable",
            insertText: "\\\$__timeFilter(${0:timeColumn})",
            // @ts-ignore
            insertTextRules: 4,
            // @ts-ignore
            sortText: "d",
        });
        this.constantSuggestions.templateVariables.push({
            label: "$__timeWindow(timeColumn)",
            kind: CodeEditorSuggestionItemKind.Constant,
            detail: "Template Variable",
            insertText: "\\\$__timeWindow(${1:timeColumn})",
            // @ts-ignore
            insertTextRules: 4,
            // @ts-ignore
            sortText: "d",
        });
    }

    private async tryFetchTable(table: string): Promise<void> {
        const tableNameComponents = table.split(".");
        if (tableNameComponents.length === 3) {
            // Case where table name in format catalog.schema.table
            await this.getSchemas(tableNameComponents[0]);
            await this.getTables(tableNameComponents[0], tableNameComponents[1]);
            await this.getColumns(table);
        }
        if (tableNameComponents.length === 2) {
            // Case where table name in format catalog.schema.table, but user is still typing table name
            // so only catalog and schema are known and need to be fetched
            await this.getSchemas(tableNameComponents[0]);
            await this.getTables(tableNameComponents[0], tableNameComponents[1]);

            // Case where default catalog is used and table name is in format schema.table
            if (this.currentCatalog) {
                await this.getTables(this.currentCatalog, tableNameComponents[0]);
                await this.getColumns(this.currentCatalog + "." + table);
            }
        }
        if (tableNameComponents.length === 1) {
            // Case where table name in format catalog.schema.table, but user is still typing table name
            // so only catalog is known and need to be fetched
            await this.getSchemas(tableNameComponents[0]);

            // Case where default catalog is used and table name is in format schema.table, user is still typing
            // table name so only schema is known and need to be fetched
            if (this.currentCatalog) {
                await this.getTables(this.currentCatalog, tableNameComponents[0]);
            }

            // Case where default catalog and schema are used and table name is in format table
            if (this.currentCatalog && this.currentSchema) {
                await this.getColumns(this.currentCatalog + "." + this.currentSchema + "." + tableNameComponents[0]);
            }
        }
    }

    private checkMetaDataRefresh(value: string, cursorPosition: {lineNumber: number, column: number}): void {
        // Check if fetch of catalog/schema/table/column metadata from databricks is needed

        const cursorIndex = positionToIndex(value, cursorPosition);
        const matchIndex = this.currentClause === "SELECT" ? cursorIndex : this.currentClauseIndex;

        // Extract table name from query
        const pattern = new RegExp("from\\s+([\\w\.]+)", "i");
        const match = pattern.exec(value.substring(matchIndex));
        if (match) {
            // Check if table name contains catalog and schema by counting dots
            this.tryFetchTable(match[1]);
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
                    // @ts-ignore
                    sortText: "b",
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
    public async updateSuggestions(value: string, cursorPosition: { lineNumber: number, column: number }): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const currentClauseResponse = getCursorPositionClause(value, cursorPosition);
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

        // Match USE Catalog clause
        const patternCatalog = new RegExp("use\\s+catalog\\s+(\\w+)", "i");
        const matchCatalog = patternCatalog.exec(value);
        if (matchCatalog) {
            const catalog = matchCatalog[1];
            if (this.suggestions.catalogs.includes(catalog)) {
                this.currentCatalog = catalog;
                this.getSchemas(catalog);
            }
        }

        // Match USE (SCHEMA/DATABASE) clause, but not USE CATALOG
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
            if (this.currentCatalog && this.suggestions.schemas.includes(schema)) {
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

        await this.dataSource.postResource("catalogs", {}).then((catalogs) => {
            this.suggestions.catalogs = catalogs;
            this.suggestions.catalogs.forEach((catalog) => {
                this.tableSuggestions.push({
                    label: catalog,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Catalog",
                    // @ts-ignore
                    sortText: "a",
                })
            })
        }).catch((error) => {
            console.log(error);
        })

        if (!(this.currentCatalog && this.currentCatalog in this.suggestions.catalogs)) {
            this.currentCatalog = undefined
        } else {
            await this.dataSource.postResource("schemas", {catalog: this.currentCatalog}).then((schemas) => {
                this.suggestions.schemas = schemas;
                this.suggestions.schemas.forEach((schema) => {
                    this.tableSuggestions.push({
                        label: this.currentCatalog + '.' + schema,
                        kind: CodeEditorSuggestionItemKind.Method,
                        detail: "Schema",
                        // @ts-ignore
                        sortText: "a",
                    })
                })
            }).catch((error) => {
                console.log(error);
            })
        }

        if (!(this.currentSchema && this.currentSchema in this.suggestions.schemas)) {
            this.currentSchema = undefined
        } else {
            this.dataSource.postResource("tables", {catalog: this.currentCatalog, schema: this.currentSchema}).then((tables) => {
                this.suggestions.tables = tables;
                this.suggestions.tables.forEach((table) => {
                    this.tableSuggestions.push({
                        label: this.currentCatalog + '.' + this.currentSchema + '.' + table,
                        kind: CodeEditorSuggestionItemKind.Method,
                        detail: "Table",
                        // @ts-ignore
                        sortText: "a",
                    })
                })
            }).catch((error) => {
                console.log(error);
            })
        }

        this.rebuildClauseSuggestions();
    }

    private async getColumns(table: string): Promise<void> {
        if (this.fetchedTableColumns === table) {
            return;
        }
        if (!this.suggestions.tables.includes(table)) {
            return;
        }
        if (this.tableColumnsCache.has(table)) {
            this.fetchedTableColumns = table;
            this.suggestions.columns = this.tableColumnsCache.get(table) || [];
            this.columnSuggestions = this.suggestions.columns.map((column): CodeEditorSuggestionItem => {
                return {
                    label: column.name,
                    kind: CodeEditorSuggestionItemKind.Field,
                    detail: column.type,
                    documentation: 'Column',
                    // @ts-ignore
                    sortText: "a",
                }
            })
            this.rebuildClauseSuggestions();
            return;
        }
        this.fetchedTableColumns = table;
        this.tableColumnsCache.set(table, []);
        this.dataSource.postResource("columns", {table: table}).then((columns) => {
            this.suggestions.columns = columns;
            this.tableColumnsCache.set(table, columns);
            this.columnSuggestions = this.suggestions.columns.map((column): CodeEditorSuggestionItem => {
                return {
                    label: column.name,
                    kind: CodeEditorSuggestionItemKind.Field,
                    detail: column.type,
                    documentation: 'Column',
                    // @ts-ignore
                    sortText: "a",
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
                    // @ts-ignore
                    sortText: "a",
                });
                this.tableSuggestions.push({
                    label: schema,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Schema",
                    // @ts-ignore
                    sortText: "b",
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
                    // @ts-ignore
                    sortText: "a",
                });
                this.tableSuggestions.push({
                    label: schema + "." + table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                    // @ts-ignore
                    sortText: "b",
                });
                this.tableSuggestions.push({
                    label: table,
                    kind: CodeEditorSuggestionItemKind.Method,
                    detail: "Table",
                    // @ts-ignore
                    sortText: "c",
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
