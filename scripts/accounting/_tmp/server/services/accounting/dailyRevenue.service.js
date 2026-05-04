"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyRevenue = getDailyRevenue;
const mappers_1 = require("./mappers");
const mssqlAccounting_1 = require("./mssqlAccounting");
const sqlBuilders_1 = require("./sqlBuilders");
async function getDailyRevenue(input) {
    const query = (0, sqlBuilders_1.buildDailyRevenueSql)(input);
    const rows = await (0, mssqlAccounting_1.mssqlQuery)(query.sql, query.params);
    return (0, mappers_1.mapDailyRevenueRows)(rows);
}
