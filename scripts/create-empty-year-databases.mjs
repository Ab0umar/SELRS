import 'dotenv/config';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const source = 'selrs26';
const apply = process.argv.includes('--apply');
const requested = process.argv.filter(arg => /^20(?:1[3-9]|2[0-5])$/.test(arg));
assert(requested.length, 'Specify target databases 2013 through 2025');
assert(new Set(requested).size === requested.length, 'Duplicate target databases');
assert(process.env.DATABASE_URL, 'DATABASE_URL is required');
const quote = name => '`' + name.replaceAll('`', '``') + '`';
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const report = { source, created: [], skipped: [] };
try {
  const [schemas] = await connection.execute('SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [source]);
  assert.equal(schemas.length, 1, 'Source database is missing');
  const schema = schemas[0];
  const [existing] = await connection.query('SHOW DATABASES');
  const names = new Set(existing.map(row => row.Database));
  const targets = requested.filter(name => {
    if (!names.has(name)) return true;
    report.skipped.push(name);
    return false;
  });
  const [objects] = await connection.execute('SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [source]);
  const [dependencies] = await connection.execute('SELECT DISTINCT TABLE_SCHEMA FROM information_schema.VIEW_TABLE_USAGE WHERE VIEW_SCHEMA = ?', [source]);
  assert(dependencies.every(row => row.TABLE_SCHEMA === source), 'Source views depend on another database; review before cloning');
  const [routines] = await connection.execute('SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?', [source]);
  const [triggers] = await connection.execute('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?', [source]);
  assert.equal(routines.length + triggers.length, 0, 'Routines/triggers need explicit support before cloning');
  const definitions = [];
  for (const object of objects) {
    const isView = object.TABLE_TYPE === 'VIEW';
    const [rows] = await connection.query(`SHOW CREATE ${isView ? 'VIEW' : 'TABLE'} ${quote(source)}.${quote(object.TABLE_NAME)}`);
    definitions.push({ name: object.TABLE_NAME, type: object.TABLE_TYPE, sql: rows[0][isView ? 'Create View' : 'Create Table'].replace(/\bAUTO_INCREMENT=\d+\s*/g, '') });
  }
  const [events] = await connection.execute('SELECT EVENT_NAME, STATUS FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?', [source]);
  assert(events.every(event => event.STATUS === 'DISABLED'), 'Enabled events must be reviewed before cloning');
  for (const event of events) {
    const [rows] = await connection.query(`SHOW CREATE EVENT ${quote(source)}.${quote(event.EVENT_NAME)}`);
    definitions.push({ name: event.EVENT_NAME, type: 'EVENT', sql: rows[0]['Create Event'] });
  }
  console.log(JSON.stringify({ source, targets, skipped: report.skipped, tables: objects.filter(object => object.TABLE_TYPE === 'BASE TABLE').length, views: objects.filter(object => object.TABLE_TYPE === 'VIEW').length, disabledEvents: events.length, apply }, null, 2));
  if (apply && targets.length) {
    const directory = `outputs/empty-year-databases/${new Date().toISOString().replaceAll(':', '-')}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/source-schema.json`, JSON.stringify({ schema, definitions }, null, 2));
    await connection.query('SET SESSION FOREIGN_KEY_CHECKS = 0');
    try {
      for (const target of targets) {
        // CREATE without IF NOT EXISTS also prevents overwriting a database created after preflight.
        await connection.query(`CREATE DATABASE ${quote(target)} CHARACTER SET ${quote(schema.DEFAULT_CHARACTER_SET_NAME)} COLLATE ${quote(schema.DEFAULT_COLLATION_NAME)}`);
        await connection.query(`USE ${quote(target)}`);
        const rewrite = sql => sql.replaceAll(`${quote(source)}.`, `${quote(target)}.`);
        for (const definition of definitions.filter(definition => definition.type === 'BASE TABLE'))
          await connection.query(rewrite(definition.sql));
        let pending = definitions.filter(definition => definition.type === 'VIEW');
        while (pending.length) {
          const failed = [];
          let lastError;
          for (const definition of pending) {
            try { await connection.query(rewrite(definition.sql)); }
            catch (error) { failed.push(definition); lastError = error; }
          }
          if (failed.length === pending.length) throw lastError;
          pending = failed;
        }
        for (const definition of definitions.filter(definition => definition.type === 'EVENT'))
          await connection.query(rewrite(definition.sql));
        for (const definition of definitions.filter(definition => definition.type === 'BASE TABLE')) {
          const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM ${quote(target)}.${quote(definition.name)}`);
          assert.equal(Number(rows[0].count), 0, `${target}.${definition.name} is not empty`);
        }
        const [viewSources] = await connection.execute('SELECT DISTINCT TABLE_SCHEMA FROM information_schema.VIEW_TABLE_USAGE WHERE VIEW_SCHEMA = ?', [target]);
        assert(viewSources.every(row => row.TABLE_SCHEMA === target), 'Cloned view points outside its year database');
        const [constraints] = await connection.execute('SELECT CONSTRAINT_TYPE, COUNT(*) AS count FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? GROUP BY CONSTRAINT_TYPE ORDER BY CONSTRAINT_TYPE', [target]);
        const [sourceConstraints] = await connection.execute('SELECT CONSTRAINT_TYPE, COUNT(*) AS count FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? GROUP BY CONSTRAINT_TYPE ORDER BY CONSTRAINT_TYPE', [source]);
        assert.deepEqual(constraints, sourceConstraints, 'Constraint counts differ');
        report.created.push(target);
        await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
        console.log(`${target}: schema cloned and every base table verified empty`);
      }
    } finally { await connection.query('SET SESSION FOREIGN_KEY_CHECKS = 1'); }
    console.log(`Schema snapshot and verification report: ${directory}`);
  }
} finally { await connection.end(); }
