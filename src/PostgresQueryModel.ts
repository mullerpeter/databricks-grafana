import {DataQuery, ScopedVars} from '@grafana/data';
import { TemplateSrv } from '@grafana/runtime';
import { VariableFormatID } from '@grafana/schema';
import {SQLQuery, SqlQueryModel, applyQueryDefaults, QueryFormat, SQLExpression} from 'components/grafana-sql/src';
import {EditorMode} from "@grafana/experimental";

interface QuerySettings {
  convertLongToWide: boolean
  fillMode?: number
  fillValue?: number
}

export interface MySQLQuery extends SQLQuery {
  alias?: string;
  format?: QueryFormat;
  rawSql?: string;
  dataset?: string;
  table?: string;
  sql?: SQLExpression;
  editorMode?: EditorMode;
  rawQuery?: boolean;
  rawSqlQuery?: string;
  querySettings?: QuerySettings;
}

export class PostgresQueryModel implements SqlQueryModel {
  target: MySQLQuery;
  templateSrv?: TemplateSrv;
  scopedVars?: ScopedVars;

  constructor(target?: MySQLQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars) {
    if (target?.rawSqlQuery) {
        target.rawSql = target.rawSqlQuery;
    }
    this.target = applyQueryDefaults(target || { refId: 'A' });
    this.templateSrv = templateSrv;
    this.scopedVars = scopedVars;
  }

  interpolate() {
    return this.templateSrv?.replace(this.target.rawSql, this.scopedVars, VariableFormatID.SQLString) || '';
  }

  quoteLiteral(value: string) {
    return "'" + value.replace(/'/g, "''") + "'";
  }
}
