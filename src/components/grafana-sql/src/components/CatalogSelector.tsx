import React, { useEffect } from 'react';
import { useAsync } from 'react-use';

import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';

import { DB, ResourceSelectorProps, SQLDialect, toOption } from '../types';

import { isSqlDatasourceDatabaseSelectionFeatureFlagEnabled } from './QueryEditorFeatureFlag.utils';

export interface CatalogSelectorProps extends ResourceSelectorProps {
  db: DB;
  catalog: string | undefined;
  preconfiguredCatalog: string | undefined;
  dialect: SQLDialect;
  onChange: (v: SelectableValue) => void;
}

export const CatalogSelector = ({ catalog, db, dialect, onChange, preconfiguredCatalog }: CatalogSelectorProps) => {
  /* 
    The behavior of this component - for MSSQL and MySQL datasources - is based on whether the user chose to create a datasource
    with or without a default database (preconfiguredCatalog). If the user configured a default database, this selector
    should only allow that single preconfigured database option to be selected. If the user chose to NOT assign/configure a default database,
    then the user should be able to use this component to choose between multiple databases available to the datasource.
  */
  // `hasPreconfigCondition` is true if either 1) the sql datasource has a preconfigured default database,
  // OR if 2) the datasource is Postgres. In either case the only option available to the user is the preconfigured database.
  const hasPreconfigCondition = !!preconfiguredCatalog || dialect === 'postgres';

  const state = useAsync(async () => {
    if (isSqlDatasourceDatabaseSelectionFeatureFlagEnabled()) {
      // If a default database is already configured for a MSSQL or MySQL data source, OR the data source is Postgres, no need to fetch other databases.
      if (hasPreconfigCondition && preconfiguredCatalog) {
        // Set the current database to the preconfigured database.
        onChange(toOption(preconfiguredCatalog));
        return [toOption(preconfiguredCatalog)];
      }
    }

    // If there is no preconfigured database, but there is a selected catalog, set the current database to the selected catalog.
    if (catalog) {
      onChange(toOption(catalog));
    }

    // Otherwise, fetch all databases available to the datasource.
    const datasets = await db.catalogs();
    return datasets.map(toOption);
  }, []);

  useEffect(() => {
      // Set default catalog when values are fetched
      if (!catalog) {
        if (state.value && state.value[0]) {
          onChange(state.value[0]);
        }
      } else {
        if (state.value && state.value.find((v) => v.value === catalog) === undefined) {
          // if value is set and newly fetched values does not contain selected value
          if (state.value.length > 0) {
            onChange(state.value[0]);
          }
        }
      }
  }, [state.value, onChange, catalog]);

  return (
    <Select
      aria-label="catalog selector"
      value={catalog}
      options={state.value}
      onChange={onChange}
      disabled={state.loading}
      isLoading={state.loading}
      menuShouldPortal={true}
    />
  );
};
