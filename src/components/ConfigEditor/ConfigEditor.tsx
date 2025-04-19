import React, {ChangeEvent, PureComponent} from 'react';
import {InlineField, Input, SecretInput, Select} from '@grafana/ui';
import {DataSourcePluginOptionsEditorProps} from '@grafana/data';
import {DatabricksDataSourceOptions, DatabricksSecureJsonData} from '../../types';
import {EditorMode} from "@grafana/experimental";
import {QueryFormat} from "../grafana-sql/src";

interface Props extends DataSourcePluginOptionsEditorProps<DatabricksDataSourceOptions> {
}

interface State {
}

export class ConfigEditor extends PureComponent<Props, State> {

    onResetSecretField = (key: string) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            secureJsonFields: {
                ...options.secureJsonFields,
                [key]: false
            },
            secureJsonData: {
                ...options.secureJsonData,
                [key]: '',
            },
        });
    };

    onSelectValueChange = (value: string | undefined, key: string) => {
        const {onOptionsChange, options} = this.props;
        let jsonData = (options.jsonData || {}) as DatabricksDataSourceOptions;
        jsonData = {
            ...jsonData,
            [key]: value
        }
        if (key == 'authenticationMethod' && value == 'azure_entra_pass_thru') {
            jsonData = {
                ...jsonData,
                oauthPassThru: true,
            }
        }
        onOptionsChange({
            ...options,
            jsonData: jsonData
        });
    }

    onValueChange = (event: ChangeEvent<HTMLInputElement>, key: string) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                [key]: event.target.value,
            },
        });
    };

    // Secure field (only sent to the backend)
    onSecureValueChange = (event: ChangeEvent<HTMLInputElement>, key: string) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            secureJsonData: {
                ...options.secureJsonData,
                [key]: event.target.value,
            },
        });
    };

    render() {
        const {options} = this.props;
        const {secureJsonFields} = options;
        const secureJsonData = (options.secureJsonData || {}) as DatabricksSecureJsonData;
        const jsonData = (options.jsonData || {}) as DatabricksDataSourceOptions;

        return (
            <>
                <h4 style={{margin: "0 0 0.6em 0"}}>Connection</h4>
                <div className="gf-form-group">
                    <InlineField label="Server Hostname" labelWidth={30}
                                 tooltip="Databricks Server Hostname (without http)">
                        <Input
                            value={jsonData.hostname || ''}
                            placeholder="XXX.cloud.databricks.com"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'hostname')}
                        />
                    </InlineField>
                    <InlineField label="Server Port" labelWidth={30} tooltip="Databricks Server Port">
                        <Input
                            value={jsonData.port || ''}
                            placeholder="443"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'port')}
                        />
                    </InlineField>
                    <InlineField label="HTTP Path" labelWidth={30}
                                 tooltip="HTTP Path value for the existing cluster or SQL warehouse.">
                        <Input
                            value={jsonData.path || ''}
                            placeholder="sql/1.0/endpoints/XXX"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'path')}
                        />
                    </InlineField>
                    <h4 style={{margin: "1em 0 0.6em 0"}}>Authentication</h4>
                    <InlineField label="Authentication Method" labelWidth={30}
                                 tooltip="PAT (Personal Access Token), M2M (Machine to Machine) OAuth or OAuth 2.0 Client Credentials (not Databricks M2M) Authentication">
                        <Select
                            onChange={({value}) => {
                                this.onSelectValueChange(value, 'authenticationMethod');
                            }}
                            options={[
                                {
                                    value: 'dsn',
                                    label: 'PAT',
                                },
                                {
                                    value: 'm2m',
                                    label: 'M2M Oauth',
                                },
                                {
                                    value: 'oauth2_client_credentials',
                                    label: 'OAuth2 Client Credentials',
                                },
                                {
                                    value: 'azure_entra_pass_thru',
                                    label: 'Pass Thru Azure Entra Auth',
                                },
                            ]}
                            value={jsonData.authenticationMethod || 'dsn'}
                            backspaceRemovesValue
                        />
                    </InlineField>
                    {jsonData.authenticationMethod === 'oauth2_client_credentials' && (
                        <>
                            <InlineField label="OAuth2 Token Endpoint" labelWidth={30} tooltip="HTTP URL to token endpoint">
                                <Input
                                    value={jsonData.externalCredentialsUrl || ''}
                                    placeholder="http://localhost:2020"
                                    width={40}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'externalCredentialsUrl')}
                                />
                            </InlineField>
                            <InlineField label="OAuth2 Scopes" labelWidth={30} tooltip="Comma separated list of scopes (optional)">
                                <Input
                                    value={jsonData.oauthScopes || ''}
                                    width={40}
                                    placeholder="api,read"
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'oauthScopes')}
                                />
                            </InlineField>
                        </>
                    )}
                    {(jsonData.authenticationMethod === 'm2m' || jsonData.authenticationMethod === 'oauth2_client_credentials') ? (
                        <>
                            <InlineField label="Client ID" labelWidth={30}
                                         tooltip="Databricks Service Principal Client ID">
                                <Input
                                    value={jsonData.clientId || ''}
                                    placeholder=""
                                    width={40}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'clientId')}
                                />
                            </InlineField>
                            <InlineField label="Client Secret" labelWidth={30}
                                         tooltip="Databricks Service Principal Client Secret">
                                <SecretInput
                                    isConfigured={(secureJsonFields && secureJsonFields.clientSecret) as boolean}
                                    value={secureJsonData.clientSecret || ''}
                                    width={40}
                                    placeholder=""
                                    onReset={() => this.onResetSecretField('clientSecret')}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => this.onSecureValueChange(event, 'clientSecret')}
                                />
                            </InlineField>
                        </>
                    ) : jsonData.authenticationMethod != 'azure_entra_pass_thru' && (
                        <InlineField label="Access Token" labelWidth={30} tooltip="Databricks Personal Access Token">
                            <SecretInput
                                isConfigured={(secureJsonFields && secureJsonFields.token) as boolean}
                                value={secureJsonData.token || ''}
                                width={40}
                                placeholder="dapi1ab2c34defabc567890123d4efa56789"
                                onReset={() => this.onResetSecretField('token')}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => this.onSecureValueChange(event, 'token')}
                            />
                        </InlineField>
                    )}
                    <hr/>
                </div>
                <h3>Additional Settings</h3>
                <h4 style={{margin: "0.75em 0 0.6em 0"}}>Query Settings</h4>
                <div className="gf-form-group">
                    <InlineField label="Min Interval (Default)" labelWidth={30}
                                 tooltip="Min Interval default value for all queries. A lower limit for the interval. Recommended to be set to write frequency, for example '1m' if your data is written every minute.">
                        <Input
                            value={jsonData.timeInterval || ''}
                            placeholder="1m"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'timeInterval')}
                        />
                    </InlineField>
                    <InlineField label="Query Format (Default)" labelWidth={30}
                                 tooltip="Query Format selected by default when creating a new query">
                        <Select
                            onChange={({value}) => {
                                this.onSelectValueChange(value, 'defaultQueryFormat');
                            }}
                            options={[
                                {
                                    value: QueryFormat.Timeseries,
                                    label: 'Timeseries',
                                },
                                {
                                    value: QueryFormat.Table,
                                    label: 'Table',
                                }
                            ]}
                            value={jsonData.defaultQueryFormat}
                            backspaceRemovesValue
                        />
                    </InlineField>
                    <InlineField label="Editor Mode (Default)" labelWidth={30}
                                 tooltip="Editor Mode selected by default when creating a new query">
                        <Select
                            onChange={({value}) => {
                                this.onSelectValueChange(value, 'defaultEditorMode');
                            }}
                            options={[
                                {
                                    value: EditorMode.Builder,
                                    label: 'Builder',
                                },
                                {
                                    value: EditorMode.Code,
                                    label: 'Code',
                                }
                            ]}
                            value={jsonData.defaultEditorMode}
                            backspaceRemovesValue
                        />
                    </InlineField>
                    <h4 style={{margin: "1em 0 0.6em 0"}}>Connection Settings</h4>
                    <InlineField label="Timeout" labelWidth={30}
                                 tooltip="Adds timeout for the server query execution. Default is no timeout (0).">
                        <Input
                            value={jsonData.timeout || ''}
                            placeholder="0"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'timeout')}
                        />
                    </InlineField>
                    <InlineField label="Retries" labelWidth={30}
                                 tooltip="The maximum number of retries for queries.">
                        <Input
                            value={jsonData.retries || ''}
                            placeholder="4"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'retries')}
                        />
                    </InlineField>
                    <InlineField label="Retry Backoff" labelWidth={30}
                                 tooltip="The backoff duration between retries in seconds.">
                        <Input
                            value={jsonData.retryBackoff || ''}
                            placeholder="1"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'retryBackoff')}
                        />
                    </InlineField>
                    <InlineField label="Max Retry Duration" labelWidth={30}
                                 tooltip="The retry timeout in seconds">
                        <Input
                            value={jsonData.maxRetryDuration || ''}
                            placeholder="30"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'maxRetryDuration')}
                        />
                    </InlineField>
                    <InlineField label="Max Rows" labelWidth={30}
                                 tooltip="The maximum number of rows to be returned per query">
                        <Input
                            value={jsonData.maxRows || ''}
                            placeholder="10000"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'maxRows')}
                        />
                    </InlineField>
                    <InlineField label="Max Open Connections" labelWidth={30}
                                 tooltip="The maximum number of open connections to the database. (0 = unlimited)">
                        <Input
                            value={jsonData.maxOpenConns || ''}
                            placeholder="0"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'maxOpenConns')}
                        />
                    </InlineField>
                    <InlineField label="Max Idle Connections" labelWidth={30}
                                 tooltip="The maximum number of idle connections to the database. (0 = no idle connections are retained)">
                        <Input
                            value={jsonData.maxIdleConns || ''}
                            placeholder="2"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'maxIdleConns')}
                        />
                    </InlineField>
                    <InlineField label="Max Connection Idle Time" labelWidth={30}
                                 tooltip="The maximum amount of time in seconds a connection may be idle before being closed. If set to 0, connections can be idle forever.">
                        <Input
                            value={jsonData.connMaxIdleTime || ''}
                            placeholder="21600"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'connMaxIdleTime')}
                        />
                    </InlineField>
                    <InlineField label="Max Connection Lifetime" labelWidth={30}
                                 tooltip="The maximum amount of time in seconds a connection may be reused. If set to 0, connections are reused forever.">
                        <Input
                            value={jsonData.connMaxLifetime || ''}
                            placeholder="21600"
                            width={40}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.onValueChange(event, 'connMaxLifetime')}
                        />
                    </InlineField>
                </div>
            </>
        );
    }
}
