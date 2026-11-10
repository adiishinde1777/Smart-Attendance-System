const db = require('./database');
const { getSeedData } = require('../utils/seedData');

async function runSeedIfNeeded() {
  const existingUsers = await db.queryOne('SELECT COUNT(*) as cnt FROM users');
  const count = existingUsers ? (existingUsers.cnt || existingUsers['COUNT(*)']) : 0;
  if (count > 0) {
    console.log(`[DB] Database already contains ${count} user(s). Skipping bootstrap.`);
    return;
  }

  console.log('[DB] Initializing clean database (Super Admin account, roles, and exam definitions only)...');
  const { adminPasswordHash } = await getSeedData();

  // 1. ROLES
  const roles = [
    [1, 'super_admin', 'Super Administrator'],
    [2, 'teacher', 'Faculty / Class Teacher'],
    [3, 'student', 'College Student']
  ];
  for (const [id, name, desc] of roles) {
    const existsRole = await db.queryOne('SELECT id FROM roles WHERE id = ? OR name = ?', [id, name]);
    if (!existsRole) {
      await db.query('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', [id, name, desc]);
    }
  }

  // 2. SUPER ADMIN ACCOUNT (to log in and add your own college data)
  await db.query(`
    INSERT INTO users (id, role_id, email, password_hash, full_name, phone, status)
    VALUES (1, 1, 'admin@college.edu', ?, 'Super Admin', '', 'active')
  `, [adminPasswordHash]);

  // 3. EXAMINATIONS STRUCTURE (CT1=10M, Mid-Sem=20M, CT2=10M -> Total 40M)
  const exams = [
    [1, 'Class Test 1', 'CT1', 10.00, 1],
    [2, 'Mid Semester Examination', 'MID_SEM', 20.00, 1],
    [3, 'Class Test 2', 'CT2', 10.00, 1]
  ];
  for (const [id, name, code, maxMarks, semester] of exams) {
    const existsExam = await db.queryOne('SELECT id FROM examinations WHERE code = ?', [code]);
    if (!existsExam) {
      await db.query('INSERT INTO examinations (id, name, code, max_marks, semester) VALUES (?, ?, ?, ?, ?)', [id, name, code, maxMarks, semester]);
    }
  }

  console.log('[DB] Clean bootstrap completed! Log in with admin@college.edu / Admin@123 to add your data.');
}

module.exports = {
  runSeedIfNeeded
};
