const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');
const { emitNotification } = require('../config/socket');
const xlsx = require('xlsx');

async function getMarks(req, res) {
  try {
    const { divisionId, subjectId, examinationId, studentId } = req.query;
    let sql = `
      SELECT m.*,
             s.roll_number, s.prn,
             u.full_name as student_name,
             sub.name as subject_name, sub.code as subject_code,
             e.name as exam_name, e.code as exam_code,
             d.name as department_name, dv.name as division_name,
             tu.full_name as evaluator_name
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN examinations e ON m.examination_id = e.id
      JOIN departments d ON s.department_id = d.id
      JOIN divisions dv ON s.division_id = dv.id
      LEFT JOIN teachers tch ON m.evaluated_by_teacher_id = tch.id
      LEFT JOIN users tu ON tch.user_id = tu.id
    `;
    const params = [];
    const where = [];

    if (divisionId) {
      where.push('s.division_id = ?');
      params.push(divisionId);
    }
    if (subjectId) {
      where.push('m.subject_id = ?');
      params.push(subjectId);
    }
    if (examinationId) {
      where.push('m.examination_id = ?');
      params.push(examinationId);
    }
    if (studentId) {
      where.push('m.student_id = ?');
      params.push(studentId);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY CAST(s.roll_number AS UNSIGNED) ASC, m.subject_id ASC, m.examination_id ASC';

    const marks = await db.query(sql, params);
    res.json({ success: true, marks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve marks: ' + err.message });
  }
}

async function getStudentConsolidatedMarks(req, res) {
  try {
    const { id } = req.params; // student_id

    // Security check: if student role, can only access own id
    if (req.user && req.user.role_name === 'student') {
      if (!req.user.student || req.user.student.student_id !== parseInt(id, 10)) {
        return res.status(403).json({ success: false, message: 'Students can only view their own marks.' });
      }
    }

    const marks = await db.query(`
      SELECT m.*, sub.name as subject_name, sub.code as subject_code,
             e.name as exam_name, e.code as exam_code
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN examinations e ON m.examination_id = e.id
      WHERE m.student_id = ?
      ORDER BY sub.id ASC, e.id ASC
    `, [id]);

    // Group by subject and calculate total out of 40
    const subjectMap = {};
    for (const m of marks) {
      if (!subjectMap[m.subject_id]) {
        subjectMap[m.subject_id] = {
          subjectId: m.subject_id,
          subjectName: m.subject_name,
          subjectCode: m.subject_code,
          ct1: null,
          midSem: null,
          ct2: null,
          totalObtained: 0,
          totalMax: 40.0
        };
      }

      if (m.exam_code === 'CT1') {
        subjectMap[m.subject_id].ct1 = parseFloat(m.marks_obtained);
        subjectMap[m.subject_id].totalObtained += parseFloat(m.marks_obtained);
      } else if (m.exam_code === 'MID_SEM') {
        subjectMap[m.subject_id].midSem = parseFloat(m.marks_obtained);
        subjectMap[m.subject_id].totalObtained += parseFloat(m.marks_obtained);
      } else if (m.exam_code === 'CT2') {
        subjectMap[m.subject_id].ct2 = parseFloat(m.marks_obtained);
        subjectMap[m.subject_id].totalObtained += parseFloat(m.marks_obtained);
      }
    }

    res.json({
      success: true,
      subjectsMarks: Object.values(subjectMap),
      rawMarks: marks
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student marks: ' + err.message });
  }
}

async function saveMarks(req, res) {
  try {
    const { studentId, subjectId, examinationId, marksObtained, remarks } = req.body;

    if (!studentId || !subjectId || !examinationId || marksObtained === undefined) {
      return res.status(400).json({ success: false, message: 'Student, Subject, Examination, and Marks are required.' });
    }

    const marksNum = parseFloat(marksObtained);
    if (isNaN(marksNum) || marksNum < 0) {
      return res.status(400).json({ success: false, message: 'Marks must be a non-negative number.' });
    }

    // Check exam max marks limit
    const exam = await db.queryOne('SELECT * FROM examinations WHERE id = ?', [examinationId]);
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found.' });

    if (marksNum > parseFloat(exam.max_marks)) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Marks obtained (${marksNum}) cannot exceed maximum marks (${exam.max_marks}) for ${exam.name}.`
      });
    }

    // Teacher ID if logged in as teacher
    const evaluatorId = req.user.teacher ? req.user.teacher.teacher_id : null;

    // Check if record exists
    const existing = await db.queryOne(`
      SELECT * FROM marks
      WHERE student_id = ? AND subject_id = ? AND examination_id = ?
    `, [studentId, subjectId, examinationId]);

    if (existing) {
      await db.query(`
        UPDATE marks
        SET marks_obtained = ?,
            max_marks = ?,
            remarks = ?,
            evaluated_by_teacher_id = COALESCE(?, evaluated_by_teacher_id),
            updated_at = NOW()
        WHERE id = ?
      `, [marksNum, exam.max_marks, remarks || null, evaluatorId, existing.id]);

      await logAudit(req.user.id, 'UPDATE_MARKS', 'marks', existing.id, existing, req.body, req);
      return res.json({ success: true, message: 'Marks updated successfully.' });
    }

    const insertRes = await db.query(`
      INSERT INTO marks (student_id, subject_id, examination_id, marks_obtained, max_marks, remarks, evaluated_by_teacher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [studentId, subjectId, examinationId, marksNum, exam.max_marks, remarks || null, evaluatorId]);

    // Send student notification
    const studentUser = await db.queryOne('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (studentUser) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New Marks Published', ?, 'marks')
      `, [studentUser.user_id, `Your marks for ${exam.name} have been updated: ${marksNum}/${exam.max_marks}.`]);
      emitNotification(studentUser.user_id, {
        title: 'New Marks Published',
        message: `Your marks for ${exam.name} have been published.`
      });
    }

    await logAudit(req.user.id, 'CREATE_MARKS', 'marks', insertRes.insertId, null, req.body, req);
    res.status(201).json({ success: true, message: 'Marks recorded successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record marks: ' + err.message });
  }
}

async function exportMarks(req, res) {
  try {
    const { divisionId, subjectId } = req.query;
    let sql = `
      SELECT s.roll_number as "Roll No", s.prn as "PRN", u.full_name as "Student Name",
             sub.name as "Subject", e.name as "Exam", m.marks_obtained as "Marks Obtained", m.max_marks as "Max Marks",
             m.remarks as "Remarks"
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN examinations e ON m.examination_id = e.id
    `;
    const params = [];
    const where = [];
    if (divisionId) {
      where.push('s.division_id = ?');
      params.push(divisionId);
    }
    if (subjectId) {
      where.push('m.subject_id = ?');
      params.push(subjectId);
    }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY CAST(s.roll_number AS UNSIGNED) ASC';

    const rows = await db.query(sql, params);
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Marks');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Internal_Marks_Report.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Export marks failed: ' + err.message });
  }
}

module.exports = {
  getMarks,
  getStudentConsolidatedMarks,
  saveMarks,
  exportMarks
};
