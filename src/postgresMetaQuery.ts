export function showTables() {
  return `SHOW TABLES in samples.tpch`;
}

export function getSchema(table: string) {
  // we will put table-name between single-quotes, so we need to escape single-quotes
  // in the table-name
  const tableNamePart = "'" + table.replace(/'/g, "''") + "'";

  return `DESCRIBE TABLE ${tableNamePart}`;
}

function buildSchemaConstraint() {
  // quote_ident protects hyphenated schemes
  return `
          quote_ident(table_schema) IN (
          SELECT
            CASE WHEN trim(s[i]) = '"$user"' THEN user ELSE trim(s[i]) END
          FROM
            generate_series(
              array_lower(string_to_array(current_setting('search_path'),','),1),
              array_upper(string_to_array(current_setting('search_path'),','),1)
            ) as i,
            string_to_array(current_setting('search_path'),',') s
          )`;
}
