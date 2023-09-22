import {DataFrame, DataQueryRequest, DataSourceInstanceSettings, MetricFindValue, ScopedVars} from '@grafana/data';
import {DataSourceWithBackend, getTemplateSrv} from '@grafana/runtime';
import {MyDataSourceOptions, MyQuery} from './types';
import {switchMap} from 'rxjs/operators';
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
                    if (data.fields.length === 0) {
                        return [];
                    } else if (data.fields.length === 1) {
                        var i0:MetricFindValue[] = data.fields[0].values.toArray().map((v, i)=>{
                            return {text: v}
                        })
                        return [i0];
                    } else {
                        var i0:MetricFindValue[] = data.fields[0].values.toArray().map((v, i)=>{
                            return {text: data.fields[1].values.toArray()[i], value: v}
                        })
                        return [i0];
                    }
                })
            ));
    }

}
