const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let dbDriver = null; // 'mysql' | 'sqlite'
let pool = null;
let sqliteDb = null;

// Ensure local data dir exists for sqlite fallback
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const sqlitePath = path.join(dataDir, 'smart_attendance.db');

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const database = process.env.DB_NAME || 'smart_attendance_iot';

  // 1. Try MySQL first
  try {
    const rawConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 3000
    });

    await rawConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rawConn.end();

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      dateStrings: true
    });

    // Test ping
    const [test] = await pool.query('SELECT 1 as test');
    if (test) {
      dbDriver = 'mysql';
      console.log(`[DB] Connected to MySQL database "${database}" on ${host}:${port}`);
      return;
    }
  } catch (err) {
    console.warn(`[DB] MySQL connection notice: ${err.message}`);
    console.log(`[DB] Seamlessly initializing Relational Embedded Database (SQLite) at: ${sqlitePath}`);
  }

  // 2. Fallback to SQLite
  dbDriver = 'sqlite';
  await new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
      if (err) return reject(err);
      sqliteDb.run('PRAGMA foreign_keys = ON;', (err2) => {
        if (err2) return reject(err2);
        console.log(`[DB] Embedded Relational Database ready.`);
        resolve();
      });
    });
  });
}

/**
 * Universal query runner supporting both MySQL and SQLite
 */
async function query(sql, params = []) {
  if (!dbDriver) await initDatabase();

  if (dbDriver === 'mysql') {
    const adaptedMysql = sql.replace(/datetime\(['"]now['"]\)/gi, 'NOW()');
    const [rows, fields] = await pool.query(adaptedMysql, params);
    // Normalize insertId for consistency
    if (rows && typeof rows.insertId !== 'undefined') {
      return { insertId: rows.insertId, affectedRows: rows.affectedRows, rows };
    }
    return rows;
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    const trimmed = sql.trim();
    const isSelect = /^SELECT|^PRAGMA|^WITH/i.test(trimmed);

    // Adapt common MySQL dialect functions for SQLite if any
    let adaptedSql = sql
      .replace(/NOW\(\)/gi, "datetime('now', 'localtime')")
      .replace(/CURDATE\(\)/gi, "date('now', 'localtime')")
      .replace(/CURRENT_DATE/gi, "date('now', 'localtime')")
      .replace(/LAST_INSERT_ID\(\)/gi, "last_insert_rowid()");

    if (isSelect) {
      sqliteDb.all(adaptedSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    } else {
      sqliteDb.run(adaptedSql, params, function (err) {
        if (err) return reject(err);
        resolve({
          insertId: this.lastID,
          affectedRows: this.changes,
          lastID: this.lastID,
          changes: this.changes
        });
      });
    }
  });
}

/**
 * Convenience method for single row
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  if (Array.isArray(rows)) {
    return rows.length > 0 ? rows[0] : null;
  }
  return rows;
}

/**
 * Execute multiple statements (for schema setup)
 */
async function execMulti(sqlString) {
  if (!dbDriver) await initDatabase();

  if (dbDriver === 'mysql') {
    // Strip block and line SQL comments before splitting statements so commented headers don't drop tables
    const cleanedSql = sqlString
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*--.*$/gm, '');
    const stmts = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const conn = await pool.getConnection();
    try {
      for (const stmt of stmts) {
        if (/^USE\s+/i.test(stmt) || /^CREATE\s+DATABASE/i.test(stmt)) continue;
        await conn.query(stmt);
      }
    } finally {
      conn.release();
    }
    return;
  }

  // SQLite multi statement
  return new Promise((resolve, reject) => {
    sqliteDb.exec(sqlString, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getDriver() {
  return dbDriver;
}

module.exports = {
  initDatabase,
  query,
  queryOne,
  execMulti,
  getDriver
};
