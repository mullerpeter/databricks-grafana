import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { MyDataSourceOptions, MyQuery } from './types';

export class DataSource extends DataSourceWithBackend<MyQuery, MyDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
  }
  applyTemplateVariables(query: MyQuery) {
    const templateSrv = getTemplateSrv();
    return {
      ...query,
      rawSqlQuery: query.rawSqlQuery ? templateSrv.replace(query.rawSqlQuery) : ''
    };
  }
}
