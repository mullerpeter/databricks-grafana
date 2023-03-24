import {DataFrame, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, ScopedVars} from '@grafana/data';
import {DataSourceWithBackend, getTemplateSrv} from '@grafana/runtime';
import {MyDataSourceOptions, MyQuery} from './types';
import {map, switchMap} from 'rxjs/operators';
import {firstValueFrom} from 'rxjs';

export class DataSource extends DataSourceWithBackend<MyQuery, MyDataSourceOptions> {
    constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
        super(instanceSettings);
        this.annotations = {}
    }

    applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars) {
        const templateSrv = getTemplateSrv();
        return {
            ...query,
            rawSqlQuery: query.rawSqlQuery ? templateSrv.replace(query.rawSqlQuery, scopedVars) : ''
        };
    }

    async metricFindQuery(queryText: string, options?: any): Promise<MetricFindValue[]> {
        if (!queryText) {
            return Promise.resolve([]);
        }

        return firstValueFrom(this.query({
            targets: [
                {
                    rawSqlQuery: getTemplateSrv().replace(queryText, options.scopedVars),
                    refId: 'metricFindQuery'
                },
            ],
            maxDataPoints: 0,
        } as DataQueryRequest<MyQuery>)
            .pipe(
                switchMap((response) => {
                    if (response.error) {
                        console.log('Error: ' + response.error.message);
                        throw new Error(response.error.message);
                    }
                    return response.data;
                }),
                switchMap((data: DataFrame) => {
                    return data.fields;
                }),
                map((field) =>
                    field.values.toArray().map((value) => {
                        return {text: value};
                    })
                )
            ));
    }
}
