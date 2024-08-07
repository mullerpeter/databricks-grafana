import { ScopedVars } from '@grafana/data';
import { TemplateSrv } from '@grafana/runtime';
import { VariableFormatID } from '@grafana/schema';
import {SQLQuery, SqlQueryModel, applyQueryDefaults} from 'components/grafana-sql/src';

export class DatabricksQueryModel implements SqlQueryModel {
  target: SQLQuery;
  templateSrv?: TemplateSrv;
  scopedVars?: ScopedVars;

  constructor(target?: SQLQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars) {
    this.target = applyQueryDefaults(target || { refId: 'A', querySettings: {convertLongToWide: false, fillMode: 0, fillValue: 0.0} });
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
