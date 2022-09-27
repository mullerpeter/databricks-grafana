import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

const { SecretFormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {

  // Secure field (only sent to the backend)
  onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: event.target.value,
      },
    });
  };

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

  onResetAPIKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
        hostname: false,
        path: false,
        token: false
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
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
        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              isConfigured={(secureJsonFields && secureJsonFields.path) as boolean}
              value={secureJsonData.path || ''}
              label="Databricks HTTP Path"
              placeholder="databricks://:<DB_ACCESS_TOKEN>@<DB_Server_Hostname>/<DB_HTTP_Path | (sql/proto...)>"
              labelWidth={10}
              inputWidth={300}
              onReset={this.onResetAPIKey}
              onChange={this.onPathChange}
            />
          </div>
          <div className="gf-form">
            <SecretFormField
                isConfigured={(secureJsonFields && secureJsonFields.hostname) as boolean}
                value={secureJsonData.hostname || ''}
                label="Databricks Hostname"
                placeholder="databricks://:<DB_ACCESS_TOKEN>@<DB_Server_Hostname>/<DB_HTTP_Path | (sql/proto...)>"
                labelWidth={10}
                inputWidth={300}
                onReset={this.onResetAPIKey}
                onChange={this.onHostnameChange}
            />
          </div>
          <div className="gf-form">
            <SecretFormField
                isConfigured={(secureJsonFields && secureJsonFields.token) as boolean}
                value={secureJsonData.token || ''}
                label="Databricks Access Token"
                placeholder="databricks://:<DB_ACCESS_TOKEN>@<DB_Server_Hostname>/<DB_HTTP_Path | (sql/proto...)>"
                labelWidth={10}
                inputWidth={300}
                onReset={this.onResetAPIKey}
                onChange={this.onTokenChange}
            />
          </div>
        </div>
      </div>
    );
  }
}
