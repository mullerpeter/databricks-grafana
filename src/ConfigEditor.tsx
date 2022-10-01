import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

const { SecretFormField } = LegacyForms;

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
      secureJsonData: {
        ...options.secureJsonData,
        hostname: event.target.value,
      },
    });
  };

  onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        path: event.target.value,
      },
    });
  };

  onResetDBConfig = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        hostname: false,
        path: false,
        token: false
      },
      secureJsonData: {
        ...options.secureJsonData,
        hostname: '',
        path: '',
        token: '',
      },
    });
  };

  render() {
    const { options } = this.props;
    const { secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

    return (
      <div className="gf-form-group">
        <div className="gf-form--alt">
          <div className="gf-form">
            <SecretFormField
                isConfigured={(secureJsonFields && secureJsonFields.hostname) as boolean}
                value={secureJsonData.hostname || ''}
                label="Server Hostname"
                placeholder="XXX.cloud.databricks.com"
                tooltip="Databricks Server Hostname (without http)"
                labelWidth={10}
                inputWidth={500}
                onReset={this.onResetDBConfig}
                onChange={this.onHostnameChange}
            />
          </div>
          <div className="gf-form">
            <SecretFormField
              isConfigured={(secureJsonFields && secureJsonFields.path) as boolean}
              value={secureJsonData.path || ''}
              label="HTTP Path"
              placeholder="sql/1.0/endpoints/XXX"
              tooltip="HTTP Path value for the existing cluster or SQL warehouse."
              labelWidth={10}
              inputWidth={500}
              onReset={this.onResetDBConfig}
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
