import React, {ChangeEvent, PureComponent} from 'react';
import {InlineField, Input, SecretInput, Select, Alert} from '@grafana/ui';
import {DataSourcePluginOptionsEditorProps} from '@grafana/data';
import {DatabricksDataSourceOptions, DatabricksSecureJsonData} from '../../types';
import {EditorMode} from "@grafana/experimental";
import {QueryFormat} from "../grafana-sql/src";

interface Props extends DataSourcePluginOptionsEditorProps<DatabricksDataSourceOptions> {
}

interface State {
}

const ConfigInputField = ({ label, tooltip, value, placeholder, onChange }: any) => (
    <InlineField label={label} labelWidth={30} tooltip={tooltip}>
        <Input value={value} placeholder={placeholder} width={40} onChange={onChange} />
    </InlineField>
);

const ConfigSelectField = ({ label, tooltip, value, options, onChange }: any) => (
    <InlineField label={label} labelWidth={30} tooltip={tooltip}>
        <Select
            onChange={({value}) => {
                onChange(value);
            }}
            options={options}
            value={value}
            backspaceRemovesValue
        />
    </InlineField>
);

const ConfigSecretInputField = ({ label, tooltip, value, placeholder, isConfigured, onReset, onChange }: any) => (
    <InlineField label={label} labelWidth={30} tooltip={tooltip}>
        <SecretInput
            isConfigured={isConfigured}
            value={value}
            placeholder={placeholder}
            width={40}
            onReset={onReset}
            onChange={onChange}
        />
    </InlineField>
);

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
        if (key == 'authenticationMethod') {
            jsonData = {
                ...jsonData,
                oauthPassThru: value === 'oauth2_pass_through',
            }
        }
        onOptionsChange({
            ...options,
            jsonData: jsonData
        });
    }

    handleValueChange = (event: ChangeEvent<HTMLInputElement>, key: string, isSecure: boolean = false) => {
        const { onOptionsChange, options } = this.props;
        const updatedOptions = isSecure
            ? {
                ...options,
                secureJsonData: {
                    ...options.secureJsonData,
                    [key]: event.target.value,
                },
            }
            : {
                ...options,
                jsonData: {
                    ...options.jsonData,
                    [key]: event.target.value,
                },
            };
        onOptionsChange(updatedOptions);
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
                    <ConfigInputField
                        label="Server Hostname"
                        tooltip="Databricks Server Hostname (without http)"
                        value={jsonData.hostname || ''}
                        placeholder="XXX.cloud.databricks.com"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'hostname')}
                    />
                    <ConfigInputField
                        label={"Server Port"}
                        tooltip={"Databricks Server Port"}
                        value={jsonData.port || ''}
                        placeholder={"443"}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'port')}/>
                    <ConfigInputField
                        label="HTTP Path"
                        tooltip="HTTP Path value for the existing cluster or SQL warehouse."
                        value={jsonData.path || ''}
                        placeholder="sql/1.0/endpoints/XXX"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'path')}
                    />
                    <h4 style={{margin: "1em 0 0.6em 0"}}>Authentication</h4>
                    <ConfigSelectField
                        label="Authentication Method"
                        tooltip="PAT (Personal Access Token), M2M (Machine to Machine) OAuth, OAuth 2.0 Client Credentials (not Databricks M2M) Authentication or Azure Entra Pass Thru (only work if Entra Auth is setup and user is signed in via Entra)"
                        value={jsonData.authenticationMethod || 'dsn'}
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
                                value: 'oauth2_pass_through',
                                label: 'OAuth2 pass-through',
                            },
                        ]}
                        onChange={(value: string) => this.onSelectValueChange(value, 'authenticationMethod')}
                    />
                    {jsonData.authenticationMethod === 'oauth2_client_credentials' && (
                        <>
                            <ConfigInputField
                                label="OAuth2 Token Endpoint"
                                tooltip={"HTTP URL to token endpoint"}
                                value={jsonData.externalCredentialsUrl || ''}
                                placeholder="http://localhost:2020"
                                onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'externalCredentialsUrl')}
                            />
                            <ConfigInputField
                                label="OAuth2 Scopes"
                                tooltip={"Comma separated list of scopes"}
                                value={jsonData.oauthScopes || ''}
                                placeholder="api,read"
                                onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'oauthScopes')}
                            />
                        </>
                    )}
                    {(jsonData.authenticationMethod === 'm2m' || jsonData.authenticationMethod === 'oauth2_client_credentials') ? (
                        <>
                            <ConfigInputField
                                label="Client ID"
                                tooltip="Databricks OAuth Client ID"
                                value={jsonData.clientId || ''}
                                placeholder=""
                                onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'clientId')}
                            />
                            <ConfigSecretInputField
                                label="Client Secret"
                                tooltip="Databricks Service Principal Client Secret"
                                isConfigured={(secureJsonFields && secureJsonFields.clientSecret) as boolean}
                                value={secureJsonData.clientSecret || ''}
                                placeholder=""
                                onReset={() => this.onResetSecretField('clientSecret')}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'clientSecret', true)}
                            />
                        </>
                    ) : jsonData.authenticationMethod != 'oauth2_pass_through' && (
                        <ConfigSecretInputField
                            label="Access Token"
                            tooltip="Databricks Personal Access Token"
                            isConfigured={(secureJsonFields && secureJsonFields.token) as boolean}
                            value={secureJsonData.token || ''}
                            placeholder=""
                            onReset={() => this.onResetSecretField('token')}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'token', true)}
                        />
                    )}
                    {jsonData.authenticationMethod === 'oauth2_pass_through' && (
                        <Alert title="OAuth2 pass-trough" severity="info">
                            <p>OAuth2 pass-trough only works if SSO Auth (i.e. Azure AD/Entra) is setup in Grafana and the user is signed in via SSO. (i.e. Alerts and other backend tasks won't work)</p>
                            <p>Make sure to set the correct permissions for the Databricks workspace and the SQL warehouse and add the correct scope in the Grafana Authentication Settings for you SSO Auth Provider.</p>
                            <p>i.E. for Azure AD/Entra SSO Auth the following scope has to be added: "2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default" (AzureDatabricks/user_impersonation)</p>
                        </Alert>
                    )}
                    <hr/>
                </div>
                <h3>Additional Settings</h3>
                <h4 style={{margin: "0.75em 0 0.6em 0"}}>Query Settings</h4>
                <div className="gf-form-group">
                    <ConfigInputField
                        label="Min Interval (Default)"
                        tooltip="Min Interval default value for all queries. A lower limit for the interval. Recommended to be set to write frequency, for example '1m' if your data is written every minute."
                        value={jsonData.timeInterval || ''}
                        placeholder="1m"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'timeInterval')}
                    />
                    <ConfigSelectField
                        label="Query Format (Default)"
                        tooltip="Query Format selected by default when creating a new query"
                        value={jsonData.defaultQueryFormat}
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
                        onChange={(value: string) => this.onSelectValueChange(value, 'defaultQueryFormat')}
                    />
                    <ConfigSelectField
                        label="Editor Mode (Default)"
                        tooltip="Editor Mode selected by default when creating a new query"
                        value={jsonData.defaultEditorMode || 'builder'}
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
                        onChange={(value: string) => this.onSelectValueChange(value, 'defaultEditorMode')}
                    />
                    <h4 style={{margin: "1em 0 0.6em 0"}}>Connection Settings</h4>
                    <ConfigInputField
                        label="Timeout"
                        tooltip="Adds timeout for the server query execution. Default is no timeout (0)."
                        value={jsonData.timeout || ''}
                        placeholder="0"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'timeout')}
                    />
                    <ConfigInputField
                        label="Retries"
                        tooltip="The maximum number of retries for queries."
                        value={jsonData.retries || ''}
                        placeholder="4"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'retries')}
                    />
                    <ConfigInputField
                        label="Retry Backoff"
                        tooltip="The backoff duration between retries in seconds."
                        value={jsonData.retryBackoff || ''}
                        placeholder="1"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'retryBackoff')}
                    />
                    <ConfigInputField
                        label="Max Retry Duration"
                        tooltip="The retry timeout in seconds"
                        value={jsonData.maxRetryDuration || ''}
                        placeholder="30"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'maxRetryDuration')}
                    />
                    <ConfigInputField
                        label="Max Rows"
                        tooltip="The maximum number of rows to be returned per query"
                        value={jsonData.maxRows || ''}
                        placeholder="10000"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'maxRows')}
                    />
                    <ConfigInputField
                        label="Max Open Connections"
                        tooltip="The maximum number of open connections to the database. (0 = unlimited)"
                        value={jsonData.maxOpenConns || ''}
                        placeholder="0"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'maxOpenConns')}
                    />
                    <ConfigInputField
                        label="Max Idle Connections"
                        tooltip="The maximum number of idle connections to the database. (0 = no idle connections are retained)"
                        value={jsonData.maxIdleConns || ''}
                        placeholder="2"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'maxIdleConns')}
                    />
                    <ConfigInputField
                        label="Max Connection Idle Time"
                        tooltip="The maximum amount of time in seconds a connection may be idle before being closed. If set to 0, connections can be idle forever."
                        value={jsonData.connMaxIdleTime || ''}
                        placeholder="21600"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'connMaxIdleTime')}
                    />
                    <ConfigInputField
                        label="Max Connection Lifetime"
                        tooltip="The maximum amount of time in seconds a connection may be reused. If set to 0, connections are reused forever."
                        value={jsonData.connMaxLifetime || ''}
                        placeholder="21600"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => this.handleValueChange(event, 'connMaxLifetime')}
                    />
                </div>
            </>
        );
    }
}
