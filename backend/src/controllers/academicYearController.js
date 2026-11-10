const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');

async function getAllAcademicYears(req, res) {
  try {
    const { departmentId } = req.query;
    let sql = `
      SELECT ay.*, d.name as department_name, d.code as department_code,
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT dv.id) as division_count
      FROM academic_years ay
      JOIN departments d ON ay.department_id = d.id
      LEFT JOIN students s ON s.academic_year_id = ay.id
      LEFT JOIN divisions dv ON dv.academic_year_id = ay.id
    `;
    const params = [];
    if (departmentId) {
      sql += ' WHERE ay.department_id = ?';
      params.push(departmentId);
    }
    sql += ' GROUP BY ay.id ORDER BY d.id ASC, ay.id ASC';

    const academicYears = await db.query(sql, params);
    res.json({ success: true, academicYears });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve academic years.' });
  }
}

async function createAcademicYear(req, res) {
  try {
    const { yearCode, name, departmentId, startDate, endDate, isCurrent } = req.body;
    if (!yearCode || !name || !departmentId) {
      return res.status(400).json({ success: false, message: 'Year Code, Name, and Department are required.' });
    }

    const result = await db.query(`
      INSERT INTO academic_years (year_code, name, department_id, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [yearCode.trim(), name.trim(), departmentId, startDate || null, endDate || null, isCurrent ? 1 : 0]);

    await logAudit(req.user.id, 'CREATE_ACADEMIC_YEAR', 'academic_years', result.insertId, null, req.body, req);
    res.status(201).json({ success: true, message: 'Academic Year created successfully.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create academic year: ' + err.message });
  }
}

async function updateAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const { yearCode, name, departmentId, startDate, endDate, isCurrent } = req.body;

    const old = await db.queryOne('SELECT * FROM academic_years WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Academic year not found.' });

    await db.query(`
      UPDATE academic_years
      SET year_code = COALESCE(?, year_code),
          name = COALESCE(?, name),
          department_id = COALESCE(?, department_id),
          start_date = ?,
          end_date = ?,
          is_current = COALESCE(?, is_current)
      WHERE id = ?
    `, [yearCode, name, departmentId, startDate || null, endDate || null, isCurrent !== undefined ? (isCurrent ? 1 : 0) : null, id]);

    await logAudit(req.user.id, 'UPDATE_ACADEMIC_YEAR', 'academic_years', id, old, req.body, req);
    res.json({ success: true, message: 'Academic year updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update academic year.' });
  }
}

async function deleteAcademicYear(req, res) {
  try {
    const { id } = req.params;
    const old = await db.queryOne('SELECT * FROM academic_years WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Academic year not found.' });

    await db.query('DELETE FROM academic_years WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_ACADEMIC_YEAR', 'academic_years', id, old, null, req);
    res.json({ success: true, message: 'Academic year removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete academic year.' });
  }
}

module.exports = {
  getAllAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear
};
