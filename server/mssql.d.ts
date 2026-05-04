/** Minimal typings — `mssql` package does not ship full declarations in all installs. */
declare module "mssql" {
  const sql: {
    VarChar(length: number): unknown;
  };
  export default sql;
}
