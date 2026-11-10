const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');

async function getAllDivisions(req, res) {
  try {
    const { departmentId, academicYearId } = req.query;
    let sql = `
      SELECT dv.*,
             d.name as department_name, d.code as department_code,
             ay.name as academic_year_name, ay.year_code,
             u.full_name as class_teacher_name, t.employee_code as teacher_code,
             COUNT(DISTINCT s.id) as student_count
      FROM divisions dv
      JOIN departments d ON dv.department_id = d.id
      JOIN academic_years ay ON dv.academic_year_id = ay.id
      LEFT JOIN teachers t ON dv.class_teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN students s ON s.division_id = dv.id
    `;
    const params = [];
    const conditions = [];

    if (departmentId) {
      conditions.push('dv.department_id = ?');
      params.push(departmentId);
    }
    if (academicYearId) {
      conditions.push('dv.academic_year_id = ?');
      params.push(academicYearId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' GROUP BY dv.id ORDER BY d.id ASC, ay.id ASC, dv.name ASC';

    const divisions = await db.query(sql, params);
    res.json({ success: true, divisions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve divisions.' });
  }
}

async function getDivisionDetails(req, res) {
  try {
    const { id } = req.params;
    const division = await db.queryOne(`
      SELECT dv.*,
             d.name as department_name, d.code as department_code,
             ay.name as academic_year_name,
             u.full_name as class_teacher_name,
             COUNT(DISTINCT s.id) as total_students
      FROM divisions dv
      JOIN departments d ON dv.department_id = d.id
      JOIN academic_years ay ON dv.academic_year_id = ay.id
      LEFT JOIN teachers t ON dv.class_teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN students s ON s.division_id = dv.id
      WHERE dv.id = ?
      GROUP BY dv.id
    `, [id]);

    if (!division) return res.status(404).json({ success: false, message: 'Division not found.' });

    // Students in division
    const students = await db.query(`
      SELECT s.id as student_id, s.roll_number, s.prn, s.status,
             u.full_name, u.email, u.phone,
             rc.card_uid, rc.status as card_status
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN rfid_cards rc ON s.rfid_card_id = rc.id
      WHERE s.division_id = ?
      ORDER BY CAST(s.roll_number AS UNSIGNED) ASC
    `, [id]);

    // Attendance stats
    const attendanceStats = await db.queryOne(`
      SELECT COUNT(*) as total_records,
             SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_count,
             SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.division_id = ?
    `, [id]);

    res.json({
      success: true,
      division,
      students,
      stats: attendanceStats
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve division details.' });
  }
}

async function createDivision(req, res) {
  try {
    const { name, departmentId, academicYearId, classTeacherId } = req.body;
    if (!name || !departmentId || !academicYearId) {
      return res.status(400).json({ success: false, message: 'Division Name, Department, and Academic Year are required.' });
    }

    const result = await db.query(`
      INSERT INTO divisions (name, department_id, academic_year_id, class_teacher_id)
      VALUES (?, ?, ?, ?)
    `, [name.trim(), departmentId, academicYearId, classTeacherId || null]);

    await logAudit(req.user.id, 'CREATE_DIVISION', 'divisions', result.insertId, null, req.body, req);
    res.status(201).json({ success: true, message: 'Division created successfully.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create division: ' + err.message });
  }
}

async function updateDivision(req, res) {
  try {
    const { id } = req.params;
    const { name, departmentId, academicYearId, classTeacherId } = req.body;

    const old = await db.queryOne('SELECT * FROM divisions WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Division not found.' });

    await db.query(`
      UPDATE divisions
      SET name = COALESCE(?, name),
          department_id = COALESCE(?, department_id),
          academic_year_id = COALESCE(?, academic_year_id),
          class_teacher_id = ?
      WHERE id = ?
    `, [name, departmentId, academicYearId, classTeacherId || null, id]);

    await logAudit(req.user.id, 'UPDATE_DIVISION', 'divisions', id, old, req.body, req);
    res.json({ success: true, message: 'Division updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update division.' });
  }
}

async function deleteDivision(req, res) {
  try {
    const { id } = req.params;
    const countRes = await db.queryOne('SELECT COUNT(*) as cnt FROM students WHERE division_id = ?', [id]);
    const cnt = countRes ? (countRes.cnt ?? countRes['COUNT(*)'] ?? 0) : 0;
    if (cnt > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete division: It contains ${cnt} student(s). Reassign them first.` });
    }

    const old = await db.queryOne('SELECT * FROM divisions WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Division not found.' });

    await db.query('DELETE FROM divisions WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_DIVISION', 'divisions', id, old, null, req);
    res.json({ success: true, message: 'Division removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete division.' });
  }
}

module.exports = {
  getAllDivisions,
  getDivisionDetails,
  createDivision,
  updateDivision,
  deleteDivision
};
