const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');

async function getTeachers(req, res) {
  try {
    const { departmentId, search } = req.query;
    let sql = `
      SELECT t.*,
             u.full_name, u.email, u.phone, u.avatar_url, u.status as account_status,
             d.name as department_name, d.code as department_code,
             COUNT(DISTINCT dv.id) as assigned_divisions_count,
             COUNT(DISTINCT tt.id) as scheduled_lectures_count
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN divisions dv ON dv.class_teacher_id = t.id
      LEFT JOIN timetables tt ON tt.teacher_id = t.id
    `;
    const params = [];
    const where = [];

    if (departmentId) {
      where.push('t.department_id = ?');
      params.push(departmentId);
    }
    if (search) {
      where.push('(LOWER(u.full_name) LIKE ? OR LOWER(t.employee_code) LIKE ? OR LOWER(u.email) LIKE ?)');
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' GROUP BY t.id ORDER BY d.id ASC, t.id ASC';

    const teachers = await db.query(sql, params);
    res.json({ success: true, teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve teachers.' });
  }
}

async function createTeacher(req, res) {
  try {
    const { fullName, email, password, phone, employeeCode, departmentId, designation, qualification } = req.body;
    if (!fullName || !email || !employeeCode || !departmentId) {
      return res.status(400).json({ success: false, message: 'Full Name, Email, Employee Code, and Department are required.' });
    }

    const existingUser = await db.queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existingUser) return res.status(400).json({ success: false, message: 'Email is already registered.' });

    const existingEmp = await db.queryOne('SELECT id FROM teachers WHERE UPPER(employee_code) = UPPER(?)', [employeeCode]);
    if (existingEmp) return res.status(400).json({ success: false, message: 'Employee Code is already registered.' });

    const defaultPw = password || 'Teacher@123';
    const pwHash = await bcrypt.hash(defaultPw, 10);

    const userRes = await db.query(`
      INSERT INTO users (role_id, email, password_hash, full_name, phone, status)
      VALUES (2, ?, ?, ?, ?, 'active')
    `, [email.toLowerCase().trim(), pwHash, fullName.trim(), phone || null]);
    const userId = userRes.insertId;

    const teacherRes = await db.query(`
      INSERT INTO teachers (user_id, employee_code, department_id, designation, qualification)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, employeeCode.toUpperCase().trim(), departmentId, designation || 'Assistant Professor', qualification || null]);

    await logAudit(req.user.id, 'CREATE_TEACHER', 'teachers', teacherRes.insertId, null, req.body, req);
    res.status(201).json({ success: true, message: 'Teacher created successfully.', teacherId: teacherRes.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create teacher: ' + err.message });
  }
}

async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const { fullName, email, phone, employeeCode, departmentId, designation, qualification, status } = req.body;

    const old = await db.queryOne('SELECT t.*, u.full_name, u.email FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    await db.query(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          phone = ?,
          status = COALESCE(?, status)
      WHERE id = ?
    `, [fullName, email ? email.toLowerCase().trim() : null, phone, status, old.user_id]);

    await db.query(`
      UPDATE teachers
      SET employee_code = COALESCE(?, employee_code),
          department_id = COALESCE(?, department_id),
          designation = COALESCE(?, designation),
          qualification = ?
      WHERE id = ?
    `, [employeeCode ? employeeCode.toUpperCase().trim() : null, departmentId, designation, qualification, id]);

    await logAudit(req.user.id, 'UPDATE_TEACHER', 'teachers', id, old, req.body, req);
    res.json({ success: true, message: 'Teacher details updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update teacher.' });
  }
}

async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;
    const old = await db.queryOne('SELECT * FROM teachers WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    // Set class_teacher_id to null in divisions
    await db.query('UPDATE divisions SET class_teacher_id = NULL WHERE class_teacher_id = ?', [id]);

    await db.query('DELETE FROM teachers WHERE id = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [old.user_id]);

    await logAudit(req.user.id, 'DELETE_TEACHER', 'teachers', id, old, null, req);
    res.json({ success: true, message: 'Teacher removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete teacher.' });
  }
}

module.exports = {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher
};
