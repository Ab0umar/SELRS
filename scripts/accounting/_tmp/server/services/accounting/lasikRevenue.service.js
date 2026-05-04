"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceRevenue = getServiceRevenue;
exports.getLasikRevenueSummary = getLasikRevenueSummary;
const mappers_1 = require("./mappers");
const mssqlAccounting_1 = require("./mssqlAccounting");
const sqlBuilders_1 = require("./sqlBuilders");
async function getServiceRevenue(input) {
    // Force a safe date range for testing
    const testInput = {
        ...input,
        fromDate: input.fromDate || '2024-01-01',
        toDate: input.toDate || '2024-01-31'
    };
    console.log(`[serviceRevenue] Query input:`, testInput);
    try {
        const query = (0, sqlBuilders_1.buildServiceRevenueSql)(testInput);
        console.log(`[serviceRevenue] SQL: ${query.sql}`);
        console.log(`[serviceRevenue] Params:`, JSON.stringify(query.params, null, 2));
        const rows = await (0, mssqlAccounting_1.mssqlQuery)(query.sql, query.params);
        console.log(`[serviceRevenue] Raw rows:`, rows.length);
        if (rows.length > 0) {
            console.log(`[serviceRevenue] Sample row:`, rows[0]);
        }
        const result = (0, mappers_1.mapServiceRevenueRows)(rows);
        console.log(`[serviceRevenue] Mapped result:`, {
            doctors: result.doctors.length,
            grandTotal: result.grandTotal,
        });
        return result;
    }
    catch (error) {
        console.error(`[serviceRevenue] Error:`, error);
        throw error;
    }
}
async function getLasikRevenueSummary(input) {
    const query = (0, sqlBuilders_1.buildLasikRevenueSummarySql)(input);
    const rows = await (0, mssqlAccounting_1.mssqlQuery)(query.sql, query.params);
    return (0, mappers_1.mapLasikRevenueSummaryRow)(rows[0], input);
}
