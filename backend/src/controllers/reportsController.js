const db = require('../config/database');
const xlsx = require('xlsx');

async function getAnalyticsOverview(req, res) {
  try {
    const { startDate, endDate, departmentId } = req.query;

    // Monthly attendance trend (last 6 months)
    const trendRows = await db.query(`
      SELECT SUBSTR(a.lecture_date, 1, 7) as month_key,
             COUNT(*) as total_scans,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_scans
      FROM attendance a
      GROUP BY SUBSTR(a.lecture_date, 1, 7)
      ORDER BY month_key ASC
      LIMIT 6
    `);

    const monthlyTrends = trendRows.map(r => ({
      month: r.month_key,
      total: r.total_scans,
      present: r.present_scans,
      percentage: r.total_scans > 0 ? parseFloat(((r.present_scans / r.total_scans) * 100).toFixed(1)) : 0
    }));

    // Division comparison
    const divisionStats = await db.query(`
      SELECT dv.name as division_name, d.code as department_code,
             COUNT(a.id) as total_attendance,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_attendance
      FROM divisions dv
      JOIN departments d ON dv.department_id = d.id
      LEFT JOIN students s ON s.division_id = dv.id
      LEFT JOIN attendance a ON a.student_id = s.id
      GROUP BY dv.id
      LIMIT 8
    `);

    const formattedDivisions = divisionStats.map(dv => ({
      name: `${dv.department_code} - ${dv.division_name}`,
      percentage: dv.total_attendance > 0 ? parseFloat(((dv.present_attendance / dv.total_attendance) * 100).toFixed(1)) : 0
    }));

    // Status distribution
    const distribution = await db.queryOne(`
      SELECT SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_count,
             SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
             SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused_count
      FROM attendance
    `);

    // Shortage students count (< 75%)
    const shortageStudents = await db.query(`
      SELECT s.id, s.roll_number, s.prn, u.full_name, d.name as department_name, dv.name as division_name,
             COUNT(a.id) as total_lectures,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as attended_lectures
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.department_id = d.id
      JOIN divisions dv ON s.division_id = dv.id
      LEFT JOIN attendance a ON a.student_id = s.id
      GROUP BY s.id
      HAVING total_lectures > 5 AND (attended_lectures * 100.0 / total_lectures) < 75.0
      LIMIT 20
    `);

    res.json({
      success: true,
      monthlyTrends,
      divisionStats: formattedDivisions,
      distribution: {
        present: distribution ? distribution.present_count || 0 : 0,
        late: distribution ? distribution.late_count || 0 : 0,
        absent: distribution ? distribution.absent_count || 0 : 0,
        excused: distribution ? distribution.excused_count || 0 : 0
      },
      shortageStudents: shortageStudents.map(st => ({
        ...st,
        percentage: ((st.attended_lectures / st.total_lectures) * 100).toFixed(1)
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve analytics: ' + err.message });
  }
}

async function generateReportData(req, res) {
  try {
    const { reportType, departmentId, academicYearId, divisionId, subjectId, startDate, endDate, format } = req.query;

    let rows = [];
    let title = 'College Management Report';

    switch (reportType) {
      case 'daily_attendance':
        title = 'Daily Attendance Report';
        rows = await db.query(`
          SELECT a.lecture_date as "Date", a.scan_time as "Time", s.roll_number as "Roll No", s.prn as "PRN",
                 u.full_name as "Student", d.code as "Dept", dv.name as "Division",
                 sub.name as "Subject", a.status as "Status", a.verification_method as "Method"
          FROM attendance a
          JOIN students s ON a.student_id = s.id
          JOIN users u ON s.user_id = u.id
          JOIN departments d ON s.department_id = d.id
          JOIN divisions dv ON s.division_id = dv.id
          JOIN subjects sub ON a.subject_id = sub.id
          WHERE (? IS NULL OR a.lecture_date >= ?) AND (? IS NULL OR a.lecture_date <= ?)
          ORDER BY a.lecture_date DESC, a.scan_time DESC
          LIMIT 500
        `, [startDate || null, startDate || null, endDate || null, endDate || null]);
        break;

      case 'student_attendance':
        title = 'Student-Wise Attendance Percentage Report';
        rows = await db.query(`
          SELECT s.roll_number as "Roll No", s.prn as "PRN", u.full_name as "Student Name",
                 d.name as "Department", dv.name as "Division",
                 COUNT(a.id) as "Total Eligible Lectures",
                 SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as "Present Lectures",
                 ROUND(CASE WHEN COUNT(a.id) > 0 THEN (SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)) ELSE 100 END, 1) as "Attendance %"
          FROM students s
          JOIN users u ON s.user_id = u.id
          JOIN departments d ON s.department_id = d.id
          JOIN divisions dv ON s.division_id = dv.id
          LEFT JOIN attendance a ON a.student_id = s.id
          GROUP BY s.id
          ORDER BY CAST(s.roll_number AS UNSIGNED) ASC
        `);
        break;

      case 'marks_report':
        title = 'Internal Examination Marks Report';
        rows = await db.query(`
          SELECT s.roll_number as "Roll No", s.prn as "PRN", u.full_name as "Student Name",
                 sub.name as "Subject", e.name as "Examination", m.marks_obtained as "Marks", m.max_marks as "Max Marks",
                 m.remarks as "Remarks"
          FROM marks m
          JOIN students s ON m.student_id = s.id
          JOIN users u ON s.user_id = u.id
          JOIN subjects sub ON m.subject_id = sub.id
          JOIN examinations e ON m.examination_id = e.id
          ORDER BY CAST(s.roll_number AS UNSIGNED) ASC, m.subject_id ASC
        `);
        break;

      case 'rfid_logs':
        title = 'RFID Card Scan Audit Logs';
        rows = await db.query(`
          SELECT l.scanned_at as "Timestamp", l.card_uid as "Card UID", dev.device_code as "Device",
                 CASE WHEN l.is_success = 1 THEN 'SUCCESS' ELSE 'FAILED' END as "Result",
                 COALESCE(l.failure_reason, 'Attendance Verified') as "Details"
          FROM device_scan_logs l
          LEFT JOIN esp32_devices dev ON l.device_id = dev.id
          ORDER BY l.scanned_at DESC
          LIMIT 300
        `);
        break;

      default:
        title = 'Attendance Summary Report';
        rows = await db.query(`
          SELECT d.name as "Department", sub.name as "Subject",
                 COUNT(a.id) as "Total Scans",
                 SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as "Present Count",
                 SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as "Late Count",
                 SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as "Absent Count"
          FROM subjects sub
          JOIN departments d ON sub.department_id = d.id
          LEFT JOIN attendance a ON a.subject_id = sub.id
          GROUP BY sub.id
        `);
        break;
    }

    if (format === 'excel') {
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Report');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType || 'report'}.xlsx"`);
      return res.send(buffer);
    }

    res.json({
      success: true,
      title,
      recordsCount: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate report: ' + err.message });
  }
}

module.exports = {
  getAnalyticsOverview,
  generateReportData
};
