const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function exportSql() {
  await db.initDatabase();

  const tables = [
    'roles', 'departments', 'academic_years', 'divisions', 'users', 'teachers',
    'subjects', 'rfid_cards', 'students', 'student_subjects', 'timetables',
    'esp32_devices', 'device_credentials', 'examinations', 'marks',
    'attendance', 'device_scan_logs', 'notifications', 'audit_logs'
  ];

  let sqlOutput = `-- =====================================================================
-- SMART ATTENDANCE SYSTEM - IoT BASED COLLEGE MANAGEMENT PLATFORM
-- Seed Data SQL Script (Includes 8 departments, 105 students, RFID UIDs, etc.)
-- =====================================================================

USE smart_attendance_iot;
SET FOREIGN_KEY_CHECKS = 0;

`;

  for (const table of tables) {
    const rows = await db.query(`SELECT * FROM ${table}`);
    if (!rows || rows.length === 0) continue;

    sqlOutput += `-- Table: ${table} (${rows.length} records)\n`;
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `\`${c}\``).join(', ');

    for (const r of rows) {
      const vals = cols.map(c => {
        const val = r[c];
        if (val === null || typeof val === 'undefined') return 'NULL';
        if (typeof val === 'number') return val;
        // Escape strings
        return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      }).join(', ');

      sqlOutput += `INSERT INTO \`${table}\` (${colList}) VALUES (${vals});\n`;
    }
    sqlOutput += '\n';
  }

  sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  const outputPath = path.join(__dirname, '../../database/seed.sql');
  fs.writeFileSync(outputPath, sqlOutput, 'utf8');
  console.log(`[EXPORT] Successfully generated ${outputPath} with all seed records!`);
  process.exit(0);
}

exportSql();
