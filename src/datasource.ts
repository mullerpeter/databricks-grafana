import {DataFrame, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, ScopedVars} from '@grafana/data';
import {DataSourceWithBackend, getTemplateSrv} from '@grafana/runtime';
import {MyDataSourceOptions, MyQuery} from './types';
import {map, switchMap} from 'rxjs/operators';
import {firstValueFrom} from 'rxjs';
import {QuerySuggestions} from "./components/Suggestions/QuerySuggestions";

export class DataSource extends DataSourceWithBackend<MyQuery, MyDataSourceOptions> {
    public suggestionProvider: QuerySuggestions;
    public autoCompletionEnabled: boolean;
    constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
        super(instanceSettings);
        this.annotations = {}
        this.suggestionProvider = new QuerySuggestions(this);
        this.autoCompletionEnabled = instanceSettings.jsonData.autoCompletion || false;
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
