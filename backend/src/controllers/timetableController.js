const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');

async function getTimetables(req, res) {
  try {
    const { departmentId, academicYearId, divisionId, dayOfWeek, teacherId } = req.query;
    let sql = `
      SELECT t.*,
             d.name as department_name, d.code as department_code,
             ay.name as academic_year_name, ay.year_code,
             dv.name as division_name,
             sub.name as subject_name, sub.code as subject_code,
             u.full_name as teacher_name, tch.employee_code as teacher_code
      FROM timetables t
      JOIN departments d ON t.department_id = d.id
      JOIN academic_years ay ON t.academic_year_id = ay.id
      JOIN divisions dv ON t.division_id = dv.id
      JOIN subjects sub ON t.subject_id = sub.id
      JOIN teachers tch ON t.teacher_id = tch.id
      JOIN users u ON tch.user_id = u.id
    `;
    const params = [];
    const where = [];

    if (departmentId) {
      where.push('t.department_id = ?');
      params.push(departmentId);
    }
    if (academicYearId) {
      where.push('t.academic_year_id = ?');
      params.push(academicYearId);
    }
    if (divisionId) {
      where.push('t.division_id = ?');
      params.push(divisionId);
    }
    if (dayOfWeek) {
      where.push('t.day_of_week = ?');
      params.push(dayOfWeek);
    }
    if (teacherId) {
      where.push('t.teacher_id = ?');
      params.push(teacherId);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY CASE t.day_of_week WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 ELSE 7 END, t.start_time ASC';

    const timetable = await db.query(sql, params);
    res.json({ success: true, timetable });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve timetables: ' + err.message });
  }
}

async function createTimetable(req, res) {
  try {
    const {
      departmentId, academicYearId, divisionId, subjectId, teacherId,
      dayOfWeek, startTime, endTime, classroom
    } = req.body;

    if (!departmentId || !academicYearId || !divisionId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime || !classroom) {
      return res.status(400).json({ success: false, message: 'All timetable parameters are required.' });
    }

    // 1. Conflict check: Teacher collision
    const teacherConflict = await db.queryOne(`
      SELECT t.*, u.full_name as teacher_name, sub.name as subject_name
      FROM timetables t
      JOIN teachers tch ON t.teacher_id = tch.id
      JOIN users u ON tch.user_id = u.id
      JOIN subjects sub ON t.subject_id = sub.id
      WHERE t.teacher_id = ? AND t.day_of_week = ?
        AND ((? >= t.start_time AND ? < t.end_time) OR (? > t.start_time AND ? <= t.end_time) OR (? <= t.start_time AND ? >= t.end_time))
    `, [teacherId, dayOfWeek, startTime, startTime, endTime, endTime, startTime, endTime]);

    if (teacherConflict) {
      return res.status(409).json({
        success: false,
        message: `Teacher Conflict: ${teacherConflict.teacher_name} is already teaching ${teacherConflict.subject_name} on ${dayOfWeek} between ${teacherConflict.start_time} - ${teacherConflict.end_time}.`
      });
    }

    // 2. Conflict check: Classroom collision
    const roomConflict = await db.queryOne(`
      SELECT t.*, sub.name as subject_name, dv.name as division_name
      FROM timetables t
      JOIN subjects sub ON t.subject_id = sub.id
      JOIN divisions dv ON t.division_id = dv.id
      WHERE LOWER(t.classroom) = LOWER(?) AND t.day_of_week = ?
        AND ((? >= t.start_time AND ? < t.end_time) OR (? > t.start_time AND ? <= t.end_time) OR (? <= t.start_time AND ? >= t.end_time))
    `, [classroom.trim(), dayOfWeek, startTime, startTime, endTime, endTime, startTime, endTime]);

    if (roomConflict) {
      return res.status(409).json({
        success: false,
        message: `Classroom Conflict: ${classroom} is already occupied by ${roomConflict.division_name} (${roomConflict.subject_name}) on ${dayOfWeek} between ${roomConflict.start_time} - ${roomConflict.end_time}.`
      });
    }

    const result = await db.query(`
      INSERT INTO timetables (department_id, academic_year_id, division_id, subject_id, teacher_id, day_of_week, start_time, end_time, classroom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [departmentId, academicYearId, divisionId, subjectId, teacherId, dayOfWeek, startTime, endTime, classroom.trim()]);

    await logAudit(req.user.id, 'CREATE_TIMETABLE', 'timetables', result.insertId, null, req.body, req);

    res.status(201).json({ success: true, message: 'Timetable entry added successfully.', timetableId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create timetable entry: ' + err.message });
  }
}

async function updateTimetable(req, res) {
  try {
    const { id } = req.params;
    const {
      departmentId, academicYearId, divisionId, subjectId, teacherId,
      dayOfWeek, startTime, endTime, classroom
    } = req.body;

    const old = await db.queryOne('SELECT * FROM timetables WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Timetable record not found.' });

    await db.query(`
      UPDATE timetables
      SET department_id = COALESCE(?, department_id),
          academic_year_id = COALESCE(?, academic_year_id),
          division_id = COALESCE(?, division_id),
          subject_id = COALESCE(?, subject_id),
          teacher_id = COALESCE(?, teacher_id),
          day_of_week = COALESCE(?, day_of_week),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          classroom = COALESCE(?, classroom)
      WHERE id = ?
    `, [departmentId, academicYearId, divisionId, subjectId, teacherId, dayOfWeek, startTime, endTime, classroom, id]);

    await logAudit(req.user.id, 'UPDATE_TIMETABLE', 'timetables', id, old, req.body, req);
    res.json({ success: true, message: 'Timetable entry updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update timetable.' });
  }
}

async function deleteTimetable(req, res) {
  try {
    const { id } = req.params;
    const old = await db.queryOne('SELECT * FROM timetables WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Timetable record not found.' });

    await db.query('DELETE FROM timetables WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_TIMETABLE', 'timetables', id, old, null, req);
    res.json({ success: true, message: 'Timetable slot removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete timetable entry.' });
  }
}

module.exports = {
  getTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable
};
