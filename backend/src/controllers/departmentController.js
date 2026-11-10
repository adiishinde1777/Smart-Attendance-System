const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');

async function getAllDepartments(req, res) {
  try {
    const departments = await db.query(`
      SELECT d.*,
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT t.id) as teacher_count,
             COUNT(DISTINCT ay.id) as academic_year_count
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id
      LEFT JOIN teachers t ON t.department_id = d.id
      LEFT JOIN academic_years ay ON ay.department_id = d.id
      GROUP BY d.id
      ORDER BY d.id ASC
    `);

    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
}

async function getDepartmentById(req, res) {
  try {
    const { id } = req.params;
    const department = await db.queryOne(`
      SELECT d.*,
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT t.id) as teacher_count
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id
      LEFT JOIN teachers t ON t.department_id = d.id
      WHERE d.id = ?
      GROUP BY d.id
    `, [id]);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    // Also get teachers in department
    const teachers = await db.query(`
      SELECT t.id, t.employee_code, t.designation, u.full_name, u.email, u.phone
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.department_id = ?
    `, [id]);

    res.json({ success: true, department, teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve department.' });
  }
}

async function createDepartment(req, res) {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Department Code and Name are required.' });
    }

    const existing = await db.queryOne('SELECT id FROM departments WHERE UPPER(code) = ? OR LOWER(name) = ?', [code.toUpperCase(), name.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A department with this code or name already exists.' });
    }

    const result = await db.query(`
      INSERT INTO departments (code, name, description, status)
      VALUES (?, ?, ?, 'active')
    `, [code.toUpperCase().trim(), name.trim(), description || '']);

    const deptId = result.insertId;

    // Automatically create default academic years (FE, SE, TE, BE) for convenience
    const defaultYears = [
      { code: 'FE', name: 'First Year' },
      { code: 'SE', name: 'Second Year' },
      { code: 'TE', name: 'Third Year' },
      { code: 'BE', name: 'Final Year' }
    ];
    for (const yr of defaultYears) {
      await db.query(`
        INSERT INTO academic_years (year_code, name, department_id, is_current)
        VALUES (?, ?, ?, 1)
      `, [yr.code, yr.name, deptId]);
    }

    await logAudit(req.user ? req.user.id : null, 'CREATE_DEPARTMENT', 'departments', deptId, null, { code, name }, req);

    res.status(201).json({ success: true, message: 'Department created successfully.', departmentId: deptId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create department: ' + err.message });
  }
}

async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { code, name, description, status } = req.body;

    const old = await db.queryOne('SELECT * FROM departments WHERE id = ?', [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    await db.query(`
      UPDATE departments
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status)
      WHERE id = ?
    `, [code ? code.toUpperCase().trim() : null, name ? name.trim() : null, description, status, id]);

    await logAudit(req.user.id, 'UPDATE_DEPARTMENT', 'departments', id, old, { code, name, description, status }, req);

    res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
}

async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;

    // Check if students or teachers exist
    const studentCount = await db.queryOne('SELECT COUNT(*) as cnt FROM students WHERE department_id = ?', [id]);
    const cnt = studentCount ? (studentCount.cnt ?? studentCount['COUNT(*)'] ?? 0) : 0;
    if (cnt > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department: It currently contains ${cnt} registered student(s). Transfer or remove students first.`
      });
    }

    const old = await db.queryOne('SELECT * FROM departments WHERE id = ?', [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    await db.query('DELETE FROM departments WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_DEPARTMENT', 'departments', id, old, null, req);

    res.json({ success: true, message: 'Department removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete department: ' + err.message });
  }
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
