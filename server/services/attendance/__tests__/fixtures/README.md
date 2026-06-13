# Attendance Test Fixtures

A real `tararus-sample.mdb` binary requires Windows ODBC / Microsoft Access to produce
and cannot be generated on CI. The `accessDbAdapter.test.ts` therefore mocks `mdb-reader`
with the exact Tararus schema (KQ_KQData / RS_Emp / column names) discovered from
`D:\Taurus.mdb` inspection. All adapter code paths are covered by the mock data.

If a real `.mdb` fixture is needed in future, use `mdb-tools` (Linux) or the Access
runtime on Windows to export a sanitised copy of the production file.
