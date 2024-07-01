import React, {useEffect} from 'react';
import { useAsync } from 'react-use';

import { SelectableValue, toOption } from '@grafana/data';
import { Select } from '@grafana/ui';

import { DB, ResourceSelectorProps } from '../types';

export interface TableSelectorProps extends ResourceSelectorProps {
  db: DB;
  table: string | undefined;
  catalog: string | undefined;
  schema: string | undefined;
  onChange: (v: SelectableValue) => void;
  unityCatalogEnabled: boolean;
}

export const TableSelector = ({ db, catalog, schema, table, className, onChange, unityCatalogEnabled }: TableSelectorProps) => {
  const state = useAsync(async () => {
    // No need to attempt to fetch tables for an unknown dataset.
    if (unityCatalogEnabled && (!catalog || !schema)) {
      return [];
    }

    const tables = await db.tables(unityCatalogEnabled ? catalog : undefined, schema);
    return tables.map(toOption);
  }, [catalog, schema, unityCatalogEnabled]);

  useEffect(() => {
    if (!table) {
      if (state.value && state.value[0]) {
        onChange(state.value[0]);
      }
    } else {
      if (state.value && state.value.find((v) => v.value === table) === undefined) {
        // if value is set and newly fetched values does not contain selected value
        if (state.value.length > 0) {
          onChange(state.value[0]);
        }
      }
    }
  }, [state.value]);

  return (
    <Select
      className={className}
      disabled={state.loading}
      aria-label="Table selector"
      value={table}
      options={state.value}
      onChange={onChange}
      isLoading={state.loading}
      menuShouldPortal={true}
      placeholder={state.loading ? 'Loading tables' : 'Select table'}
    />
  );
};
