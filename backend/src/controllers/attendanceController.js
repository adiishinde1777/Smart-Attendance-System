const db = require('../config/database');
const { processRfidScan, syncOfflineQueue } = require('../services/attendanceEngine');
const { logAudit } = require('../middleware/auditLogger');
const { emitAttendanceMarked } = require('../config/socket');

async function handleScan(req, res) {
  try {
    const { cardUid, deviceCode, scanEventId } = req.body;
    if (!cardUid) {
      return res.status(400).json({ success: false, message: 'Card UID is required.' });
    }

    // Default to Classroom 101 device if not supplied (e.g. from simulator)
    const code = deviceCode || req.headers['x-device-id'] || 'ESP32-TY-A-01';

    const result = await processRfidScan({
      cardUid,
      deviceCode: code,
      scanEventId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[SCAN CONTROLLER ERROR]', err);
    res.status(500).json({ success: false, message: 'Internal error processing attendance scan.' });
  }
}

async function getAttendanceRecords(req, res) {
  try {
    const { date, departmentId, academicYearId, divisionId, subjectId, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = [];
    let params = [];

    if (date) {
      where.push('a.lecture_date = ?');
      params.push(date);
    }
    if (departmentId) {
      where.push('s.department_id = ?');
      params.push(departmentId);
    }
    if (academicYearId) {
      where.push('s.academic_year_id = ?');
      params.push(academicYearId);
    }
    if (divisionId) {
      where.push('s.division_id = ?');
      params.push(divisionId);
    }
    if (subjectId) {
      where.push('a.subject_id = ?');
      params.push(subjectId);
    }
    if (status) {
      where.push('a.status = ?');
      params.push(status);
    }

    const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRes = await db.queryOne(`
      SELECT COUNT(*) as total
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      ${whereSql}
    `, params);
    const total = countRes ? (countRes.total ?? countRes['COUNT(*)'] ?? 0) : 0;

    const records = await db.query(`
      SELECT a.*,
             s.roll_number, s.prn,
             u.full_name as student_name,
             sub.name as subject_name, sub.code as subject_code,
             d.name as department_name,
             dv.name as division_name,
             dev.device_code, dev.classroom,
             tu.full_name as marked_by_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN departments d ON s.department_id = d.id
      JOIN divisions dv ON s.division_id = dv.id
      LEFT JOIN esp32_devices dev ON a.device_id = dev.id
      LEFT JOIN users tu ON a.marked_by_user_id = tu.id
      ${whereSql}
      ORDER BY a.lecture_date DESC, a.scan_time DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

    res.json({
      success: true,
      records,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance records: ' + err.message });
  }
}

async function getStudentAttendance(req, res) {
  try {
    const { id } = req.params; // student_id

    // Security check: if student role, can only access own id
    if (req.user && req.user.role_name === 'student') {
      if (!req.user.student || req.user.student.student_id !== parseInt(id, 10)) {
        return res.status(403).json({ success: false, message: 'Students can only view their own attendance.' });
      }
    }

    // Overall stats
    const stats = await db.queryOne(`
      SELECT COUNT(*) as total_eligible,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as attended,
             SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_count,
             SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count
      FROM attendance a
      WHERE a.student_id = ?
    `, [id]);

    const totalEligible = stats ? (stats.total_eligible || 0) : 0;
    const attended = stats ? (stats.attended || 0) : 0;
    const overallPercentage = totalEligible > 0 ? ((attended / totalEligible) * 100).toFixed(1) : '0.0';

    // Subject breakdown
    const subjectWise = await db.query(`
      SELECT sub.id as subject_id, sub.name as subject_name, sub.code as subject_code,
             COUNT(a.id) as total_lectures,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as attended_lectures,
             SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_lectures
      FROM student_subjects ss
      JOIN subjects sub ON ss.subject_id = sub.id
      LEFT JOIN attendance a ON a.student_id = ss.student_id AND a.subject_id = sub.id
      WHERE ss.student_id = ?
      GROUP BY sub.id
    `, [id]);

    const formattedSubjectWise = subjectWise.map(s => {
      const tot = s.total_lectures || 0;
      const att = s.attended_lectures || 0;
      const pct = tot > 0 ? ((att / tot) * 100).toFixed(1) : '0.0';
      return {
        ...s,
        percentage: parseFloat(pct),
        is_shortage: parseFloat(pct) < 75.0 && tot > 3
      };
    });

    // History log (last 50 records)
    const history = await db.query(`
      SELECT a.*, sub.name as subject_name, sub.code as subject_code,
             t.classroom, u.full_name as teacher_name
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN timetables t ON a.timetable_id = t.id
      LEFT JOIN teachers tch ON t.teacher_id = tch.id
      LEFT JOIN users u ON tch.user_id = u.id
      WHERE a.student_id = ?
      ORDER BY a.lecture_date DESC, a.scan_time DESC
      LIMIT 100
    `, [id]);

    res.json({
      success: true,
      stats: {
        totalLectures: totalEligible,
        attendedLectures: attended,
        presentCount: stats ? stats.present_count || 0 : 0,
        lateCount: stats ? stats.late_count || 0 : 0,
        absentCount: stats ? stats.absent_count || 0 : 0,
        percentage: parseFloat(overallPercentage),
        isShortage: parseFloat(overallPercentage) < 75.0 && totalEligible > 3
      },
      subjectWise: formattedSubjectWise,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve student attendance: ' + err.message });
  }
}

async function getSubjectAttendanceStats(req, res) {
  try {
    const { divisionId, departmentId } = req.query;
    let sql = `
      SELECT sub.id as subject_id, sub.name as subject_name, sub.code as subject_code,
             COUNT(a.id) as total_attendance_entries,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count
      FROM subjects sub
      LEFT JOIN attendance a ON a.subject_id = sub.id
      LEFT JOIN students s ON a.student_id = s.id
    `;
    const params = [];
    const where = [];

    if (divisionId) {
      where.push('s.division_id = ?');
      params.push(divisionId);
    }
    if (departmentId) {
      where.push('sub.department_id = ?');
      params.push(departmentId);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' GROUP BY sub.id ORDER BY sub.id ASC';

    const list = await db.query(sql, params);
    const result = list.map(item => {
      const tot = item.total_attendance_entries || 0;
      const pres = item.present_count || 0;
      const pct = tot > 0 ? ((pres / tot) * 100).toFixed(1) : '0.0';
      return {
        ...item,
        percentage: parseFloat(pct)
      };
    });

    res.json({ success: true, subjects: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve subject stats.' });
  }
}

async function updateAttendance(req, res) {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !['Present', 'Absent', 'Late', 'Excused'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status required: Present, Absent, Late, Excused.' });
    }

    if (!remarks || remarks.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Mandatory correction reason (remarks) is required for audit.' });
    }

    const old = await db.queryOne('SELECT * FROM attendance WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Attendance record not found.' });

    await db.query(`
      UPDATE attendance
      SET status = ?,
          remarks = ?,
          verification_method = 'manual',
          marked_by_user_id = ?
      WHERE id = ?
    `, [status, remarks.trim(), req.user.id, id]);

    await logAudit(req.user.id, 'MANUAL_ATTENDANCE_CORRECTION', 'attendance', id, old, { status, remarks, by: req.user.full_name }, req);

    res.json({ success: true, message: 'Attendance status corrected and audit recorded.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update attendance: ' + err.message });
  }
}

async function finalizeLecture(req, res) {
  try {
    const { timetableId, lectureDate } = req.body;
    if (!timetableId || !lectureDate) {
      return res.status(400).json({ success: false, message: 'Timetable ID and Lecture Date are required.' });
    }

    const timetable = await db.queryOne(`
      SELECT t.*, sub.name as subject_name
      FROM timetables t
      JOIN subjects sub ON t.subject_id = sub.id
      WHERE t.id = ?
    `, [timetableId]);

    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });

    // Find all enrolled students in this division who did NOT scan
    const studentsInDiv = await db.query(`
      SELECT s.id as student_id
      FROM students s
      WHERE s.division_id = ? AND s.status = 'active'
    `, [timetable.division_id]);

    let markedAbsentCount = 0;
    for (const st of studentsInDiv) {
      const exists = await db.queryOne('SELECT id FROM attendance WHERE student_id = ? AND timetable_id = ? AND lecture_date = ?', [st.student_id, timetableId, lectureDate]);
      if (!exists) {
        await db.query(`
          INSERT INTO attendance (student_id, subject_id, timetable_id, lecture_date, scan_time, status, verification_method, remarks, marked_by_user_id)
          VALUES (?, ?, ?, ?, '12:00:00', 'Absent', 'manual', 'Auto-marked Absent on lecture finalization', ?)
        `, [st.student_id, timetable.subject_id, timetableId, lectureDate, req.user.id]);
        markedAbsentCount++;
      }
    }

    await logAudit(req.user.id, 'FINALIZE_LECTURE_ATTENDANCE', 'timetables', timetableId, null, { lectureDate, markedAbsentCount }, req);

    res.json({
      success: true,
      message: `Lecture attendance finalized. ${markedAbsentCount} absent student(s) recorded.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to finalize lecture: ' + err.message });
  }
}

async function getDashboardSummary(req, res) {
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const studentTotal = await db.queryOne('SELECT COUNT(*) as cnt FROM students WHERE status = "active"');
    const deptTotal = await db.queryOne('SELECT COUNT(*) as cnt FROM departments WHERE status = "active"');
    const teacherTotal = await db.queryOne('SELECT COUNT(*) as cnt FROM teachers');
    const divTotal = await db.queryOne('SELECT COUNT(*) as cnt FROM divisions');
    const subjectTotal = await db.queryOne('SELECT COUNT(*) as cnt FROM subjects');
    const timetableTotal = await db.queryOne('SELECT COUNT(*) as cnt FROM timetables');
    const deviceTotal = await db.queryOne('SELECT COUNT(*) as total, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online_cnt FROM esp32_devices');

    // Today's attendance
    const todayAtt = await db.queryOne(`
      SELECT COUNT(*) as total_today,
             SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_today,
             SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_today
      FROM attendance
      WHERE lecture_date = ?
    `, [today]);

    // Overall attendance rate across all records
    const overallAtt = await db.queryOne(`
      SELECT COUNT(*) as total_all,
             SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_all
      FROM attendance
    `);

    const totAll = overallAtt ? (overallAtt.total_all || 0) : 0;
    const presAll = overallAtt ? (overallAtt.present_all || 0) : 0;
    const overallPct = totAll > 0 ? ((presAll / totAll) * 100).toFixed(1) : '0.0';

    // Department-wise attendance breakdown
    const deptAttendance = await db.query(`
      SELECT d.name as department_name, d.code as department_code,
             COUNT(a.id) as total_scans,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_scans
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id
      LEFT JOIN attendance a ON a.student_id = s.id
      GROUP BY d.id
      LIMIT 8
    `);

    const formattedDept = deptAttendance.map(d => {
      const tot = d.total_scans || 0;
      const pr = d.present_scans || 0;
      return {
        name: d.department_code,
        fullName: d.department_name,
        percentage: tot > 0 ? parseFloat(((pr / tot) * 100).toFixed(1)) : 0.0
      };
    });

    // Recent 10 scans / activities
    const recentScans = await db.query(`
      SELECT a.id, a.lecture_date, a.scan_time, a.status,
             s.roll_number, s.prn, u.full_name as student_name,
             sub.name as subject_name,
             dev.device_code, dev.classroom
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN esp32_devices dev ON a.device_id = dev.id
      ORDER BY a.id DESC
      LIMIT 10
    `);

    const getCount = (row) => (row && row.cnt !== undefined ? row.cnt : (row && row['COUNT(*)'] !== undefined ? row['COUNT(*)'] : 0));

    res.json({
      success: true,
      summary: {
        totalStudents: getCount(studentTotal),
        totalDepartments: getCount(deptTotal),
        totalTeachers: getCount(teacherTotal),
        totalDivisions: getCount(divTotal),
        totalSubjects: getCount(subjectTotal),
        totalTimetables: getCount(timetableTotal),
        todayPresent: todayAtt ? (todayAtt.present_today ?? 0) : 0,
        todayAbsent: todayAtt ? (todayAtt.absent_today ?? 0) : 0,
        overallPercentage: parseFloat(overallPct),
        connectedDevices: deviceTotal ? (deviceTotal.online_cnt ?? 0) : 0,
        totalDevices: deviceTotal ? (deviceTotal.total ?? 0) : 0
      },
      deptAttendance: formattedDept,
      recentScans
    });
  } catch (err) {
    console.error('[DASHBOARD SUMMARY ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard summary: ' + err.message });
  }
}

module.exports = {
  handleScan,
  getAttendanceRecords,
  getStudentAttendance,
  getSubjectAttendanceStats,
  updateAttendance,
  finalizeLecture,
  getDashboardSummary
};
