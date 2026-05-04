"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mssqlQuery = mssqlQuery;
const mssqlPatients_1 = require("../../integrations/mssqlPatients");
async function mssqlQuery(sql, params) {
    const pool = (await (0, mssqlPatients_1.createMssqlPool)());
    await pool.connect();
    const request = pool.request();
    request.arrayRowMode = false;
    for (const [name, value] of Object.entries(params)) {
        request.input(name, value);
    }
    const startedAt = Date.now();
    const result = await request.query(sql);
    console.debug(`[accounting:mssql] query completed in ${Date.now() - startedAt}ms`);
    return Array.isArray(result.recordset) ? result.recordset : [];
}
