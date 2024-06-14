import React, {ChangeEvent, FormEvent, PureComponent} from 'react';
import { InlineField, Input, SecretInput, InlineSwitch, Alert, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {

  // Secure field (only sent to the backend)
  onTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
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
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        clientSecret: event.target.value,
      },
    });
  };

  onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        clientId: event.target.value,
      },
    });
  };

  onHostnameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        hostname: event.target.value,
      },
    });
  };

  onPortChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        port: event.target.value,
      },
    });
  };

  onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        path: event.target.value.replace(/^\//, ''),
      },
    });
  };

  onAutoCompletionChange = (event: FormEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        autoCompletion: event.currentTarget.checked,
      },
    });
  };

  onResetDBConfig = () => {
    const { onOptionsChange, options } = this.props;
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
    const { onOptionsChange, options } = this.props;
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

  onConnectionMethodChange = (value: string | undefined) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        connectionMethod: value,
      },
    });
  }

  render() {
    const { options } = this.props;
    const { secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;
    const jsonData = (options.jsonData || {}) as MyDataSourceOptions;

    return (
        <>
          <div className="gf-form-group">
            <InlineField label="Server Hostname" labelWidth={30} tooltip="Databricks Server Hostname (without http)">
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
            <InlineField label="HTTP Path" labelWidth={30} tooltip="HTTP Path value for the existing cluster or SQL warehouse.">
              <Input
                  value={jsonData.path || ''}
                  placeholder="sql/1.0/endpoints/XXX"
                  width={40}
                  onChange={this.onPathChange}
              />
            </InlineField>
            <InlineField label="Authentication Type" labelWidth={30} tooltip="PAT (Personal Access Token) or M2M (Machine to Machine) OAuth Authentication">
              <Select
                  onChange={({ value }) => {
                    this.onConnectionMethodChange(value);
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
                  ]}
                  value={jsonData.connectionMethod || 'dsn'}
                  backspaceRemovesValue
              />
            </InlineField>
            {jsonData.connectionMethod === 'm2m' ? (
                <>
                  <InlineField label="Client ID" labelWidth={30} tooltip="Databricks Service Principal Client ID">
                    <Input
                        value={jsonData.clientId || ''}
                        placeholder=""
                        width={40}
                        onChange={this.onClientIdChange}
                    />
                  </InlineField>
                  <InlineField label="Client Secret" labelWidth={30} tooltip="Databricks Service Principal Client Secret">
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
          </div>
          <div className="gf-form-group">
            <Alert title="Code Auto Completion (Experimental Feature)" severity="info">
              <div>
                Auto Completion for the code editor is still in development. Basic functionality is implemented,
                but might not always work perfectly. When enabled, the editor will make requests to Databricks
                while typing to get the available catalogs, schemas, tables and columns. Only the tables present
                in the current query will be fetched.
              </div>
            </Alert>
            <InlineField label="Code Auto Completion" labelWidth={30} tooltip="Enable code auto completion for SQL queries.">
              <InlineSwitch
                  value={jsonData.autoCompletion || false}
                  onChange={this.onAutoCompletionChange}
              />
            </InlineField>
          </div>
        </>
    );
  }
}
