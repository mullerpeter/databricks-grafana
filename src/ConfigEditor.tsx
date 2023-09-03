import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

const { SecretFormField, FormField } = LegacyForms;

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

  render() {
    const { options } = this.props;
    const { secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;
    const jsonData = (options.jsonData || {}) as MyDataSourceOptions;

    return (
      <div className="gf-form-group">
        <div className="gf-form--alt">
          <div className="gf-form">
            <FormField
                value={jsonData.hostname || ''}
                label="Server Hostname"
                placeholder="XXX.cloud.databricks.com"
                tooltip="Databricks Server Hostname (without http)"
                labelWidth={10}
                inputWidth={500}
                onChange={this.onHostnameChange}
            />
          </div>
          <div className="gf-form">
            <FormField
                value={jsonData.port || ''}
                label="Server Port"
                placeholder="443"
                tooltip="Databricks Server Port"
                labelWidth={10}
                inputWidth={500}
                onChange={this.onPortChange}
            />
          </div>
          <div className="gf-form">
            <FormField
              value={jsonData.path || ''}
              label="HTTP Path"
              placeholder="sql/1.0/endpoints/XXX"
              tooltip="HTTP Path value for the existing cluster or SQL warehouse."
              labelWidth={10}
              inputWidth={500}
              onChange={this.onPathChange}
            />
          </div>
          <div className="gf-form">
            <SecretFormField
                isConfigured={(secureJsonFields && secureJsonFields.token) as boolean}
                value={secureJsonData.token || ''}
                label="Access Token"
                placeholder="dapi1ab2c34defabc567890123d4efa56789"
                tooltip="Databricks Personal Access Token"
                labelWidth={10}
                inputWidth={500}
                onReset={this.onResetDBConfig}
                onChange={this.onTokenChange}
            />
          </div>
        </div>
      </div>
    );
  }
}
