import React, {ChangeEvent, PureComponent} from 'react';
import {InlineField, Input, SecretInput, Select} from '@grafana/ui';
import {DataSourcePluginOptionsEditorProps} from '@grafana/data';
import {DatabricksDataSourceOptions, DatabricksSecureJsonData} from '../../types';

interface Props extends DataSourcePluginOptionsEditorProps<DatabricksDataSourceOptions> {
}

interface State {
}

export class ConfigEditor extends PureComponent<Props, State> {

    // Secure field (only sent to the backend)
    onTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            secureJsonData: {
                ...options.secureJsonData,
                token: event.target.value,
            },
        });
    };

    // Secure field (only sent to the backend)
    onClientSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            secureJsonData: {
                ...options.secureJsonData,
                clientSecret: event.target.value,
            },
        });
    };

    onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                clientId: event.target.value,
            },
        });
    };

    onHostnameChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                hostname: event.target.value,
            },
        });
    };

    onPortChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                port: event.target.value,
            },
        });
    };

    onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                path: event.target.value.replace(/^\//, ''),
            },
        });
    };

    onResetDBConfig = () => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            secureJsonFields: {
                ...options.secureJsonFields,
                token: false
            },
            secureJsonData: {
                ...options.secureJsonData,
                token: '',
            },
        });
    };

    onResetClientSecret = () => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            secureJsonFields: {
                ...options.secureJsonFields,
                clientSecret: false
            },
            secureJsonData: {
                ...options.secureJsonData,
                clientSecret: '',
            },
        });
    };

    onAuthenticationMethodChange = (value: string | undefined) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                authenticationMethod: value,
            },
        });
    }

    onExternalCredentialsUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                externalCredentialsUrl: event.target.value,
            },
        });
    };

    onMaxOpenConnsChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                maxOpenConns: Number(event.target.value),
            },
        });
    };

    onMaxIdleConnsChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                maxIdleConns: Number(event.target.value),
            },
        });
    };

    onMaxIdleTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                connMaxIdleTime: Number(event.target.value),
            },
        });
    };

    onMaxLifetimeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                connMaxLifetime: Number(event.target.value),
            },
        });
    };

    onTimeIntervalChange = (event: ChangeEvent<HTMLInputElement>) => {
        const {onOptionsChange, options} = this.props;
        onOptionsChange({
            ...options,
            jsonData: {
                ...options.jsonData,
                timeInterval: event.target.value,
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
                            onChange={this.onHostnameChange}
                        />
                    </InlineField>
                    <InlineField label="Server Port" labelWidth={30} tooltip="Databricks Server Port">
                        <Input
                            value={jsonData.port || ''}
                            placeholder="443"
                            width={40}
                            onChange={this.onPortChange}
                        />
                    </InlineField>
                    <InlineField label="HTTP Path" labelWidth={30}
                                 tooltip="HTTP Path value for the existing cluster or SQL warehouse.">
                        <Input
                            value={jsonData.path || ''}
                            placeholder="sql/1.0/endpoints/XXX"
                            width={40}
                            onChange={this.onPathChange}
                        />
                    </InlineField>
                    <h4 style={{margin: "1em 0 0.6em 0"}}>Authentication</h4>
                    <InlineField label="Authentication Method" labelWidth={30}
                                 tooltip="PAT (Personal Access Token), M2M (Machine to Machine) OAuth or OAuth 2.0 Client Credentials (not Databricks M2M) Authentication">
                        <Select
                            onChange={({value}) => {
                                this.onAuthenticationMethodChange(value);
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
                            ]}
                            value={jsonData.authenticationMethod || 'dsn'}
                            backspaceRemovesValue
                        />
                    </InlineField>
                    {jsonData.authenticationMethod === 'oauth2_client_credentials' && (
                        <InlineField label="OAuth2 Token Endpoint" labelWidth={30} tooltip="HTTP URL to token endpoint">
                            <Input
                                value={jsonData.externalCredentialsUrl || ''}
                                placeholder="http://localhost:2020"
                                width={40}
                                onChange={this.onExternalCredentialsUrlChange}
                            />
                        </InlineField>
                    )}
                    {(jsonData.authenticationMethod === 'm2m' || jsonData.authenticationMethod === 'oauth2_client_credentials') ? (
                        <>
                            <InlineField label="Client ID" labelWidth={30}
                                         tooltip="Databricks Service Principal Client ID">
                                <Input
                                    value={jsonData.clientId || ''}
                                    placeholder=""
                                    width={40}
                                    onChange={this.onClientIdChange}
                                />
                            </InlineField>
                            <InlineField label="Client Secret" labelWidth={30}
                                         tooltip="Databricks Service Principal Client Secret">
                                <SecretInput
                                    isConfigured={(secureJsonFields && secureJsonFields.clientSecret) as boolean}
                                    value={secureJsonData.clientSecret || ''}
                                    width={40}
                                    placeholder=""
                                    onReset={this.onResetClientSecret}
                                    onChange={this.onClientSecretChange}
                                />
                            </InlineField>
                        </>
                    ) : (
                        <InlineField label="Access Token" labelWidth={30} tooltip="Databricks Personal Access Token">
                            <SecretInput
                                isConfigured={(secureJsonFields && secureJsonFields.token) as boolean}
                                value={secureJsonData.token || ''}
                                width={40}
                                placeholder="dapi1ab2c34defabc567890123d4efa56789"
                                onReset={this.onResetDBConfig}
                                onChange={this.onTokenChange}
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
                            onChange={this.onTimeIntervalChange}
                        />
                    </InlineField>
                    <h4 style={{margin: "1em 0 0.6em 0"}}>Connection Settings</h4>
                    <InlineField label="Max Open" labelWidth={30}
                                 tooltip="The maximum number of open connections to the database. (0 = unlimited)">
                        <Input
                            value={jsonData.maxOpenConns || '0'}
                            placeholder="0"
                            width={40}
                            onChange={this.onMaxOpenConnsChange}
                        />
                    </InlineField>
                    <InlineField label="Max Idle" labelWidth={30}
                                 tooltip="The maximum number of idle connections to the database. (0 = no idle connections are retained)">
                        <Input
                            value={jsonData.maxIdleConns || '2'}
                            placeholder="2"
                            width={40}
                            onChange={this.onMaxIdleConnsChange}
                        />
                    </InlineField>
                    <InlineField label="Max Idle Time" labelWidth={30}
                                 tooltip="The maximum amount of time in seconds a connection may be idle before being closed. If set to 0, connections can be idle forever.">
                        <Input
                            value={jsonData.connMaxIdleTime || '21600'}
                            placeholder="21600"
                            width={40}
                            onChange={this.onMaxIdleTimeChange}
                        />
                    </InlineField>
                    <InlineField label="Max Lifetime" labelWidth={30}
                                 tooltip="The maximum amount of time in seconds a connection may be reused. If set to 0, connections are reused forever.">
                        <Input
                            value={jsonData.connMaxLifetime || '21600'}
                            placeholder="21600"
                            width={40}
                            onChange={this.onMaxLifetimeChange}
                        />
                    </InlineField>
                </div>
            </>
        );
    }
}
