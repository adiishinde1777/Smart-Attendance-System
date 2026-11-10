const express = require('express');
const router = express.Router();

const authCtrl = require('../controllers/authController');
const deptCtrl = require('../controllers/departmentController');
const ayCtrl = require('../controllers/academicYearController');
const divCtrl = require('../controllers/divisionController');
const studentCtrl = require('../controllers/studentController');
const teacherCtrl = require('../controllers/teacherController');
const rfidCtrl = require('../controllers/rfidController');
const attCtrl = require('../controllers/attendanceController');
const ttCtrl = require('../controllers/timetableController');
const marksCtrl = require('../controllers/marksController');
const devCtrl = require('../controllers/deviceController');
const repCtrl = require('../controllers/reportsController');
const notifCtrl = require('../controllers/notificationController');

const { authenticate } = require('../middleware/auth');
const { requireTeacherOrAdmin, requireSuperAdmin } = require('../middleware/rbac');
const { authenticateDevice } = require('../middleware/deviceAuth');
const db = require('../config/database');

// -------------------------------------------------------------
// 1. AUTHENTICATION ROUTES
// -------------------------------------------------------------
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.get('/auth/me', authenticate, authCtrl.getMe);
router.post('/auth/forgot-password', authCtrl.forgotPassword);

// -------------------------------------------------------------
// 2. DEPARTMENTS
// -------------------------------------------------------------
router.get('/departments', deptCtrl.getAllDepartments);
router.get('/departments/:id', deptCtrl.getDepartmentById);
router.post('/departments', authenticate, requireTeacherOrAdmin, deptCtrl.createDepartment);
router.put('/departments/:id', authenticate, requireTeacherOrAdmin, deptCtrl.updateDepartment);
router.delete('/departments/:id', authenticate, requireSuperAdmin, deptCtrl.deleteDepartment);

// -------------------------------------------------------------
// 3. ACADEMIC YEARS
// -------------------------------------------------------------
router.get('/academic-years', ayCtrl.getAllAcademicYears);
router.post('/academic-years', authenticate, requireTeacherOrAdmin, ayCtrl.createAcademicYear);
router.put('/academic-years/:id', authenticate, requireTeacherOrAdmin, ayCtrl.updateAcademicYear);
router.delete('/academic-years/:id', authenticate, requireTeacherOrAdmin, ayCtrl.deleteAcademicYear);

// -------------------------------------------------------------
// 4. DIVISIONS
// -------------------------------------------------------------
router.get('/divisions', divCtrl.getAllDivisions);
router.get('/divisions/:id', divCtrl.getDivisionDetails);
router.post('/divisions', authenticate, requireTeacherOrAdmin, divCtrl.createDivision);
router.put('/divisions/:id', authenticate, requireTeacherOrAdmin, divCtrl.updateDivision);
router.delete('/divisions/:id', authenticate, requireTeacherOrAdmin, divCtrl.deleteDivision);

// -------------------------------------------------------------
// 5. STUDENTS
// -------------------------------------------------------------
router.get('/students', authenticate, studentCtrl.getStudents);
router.get('/students/export', authenticate, requireTeacherOrAdmin, studentCtrl.exportStudents);
router.get('/students/:id', authenticate, studentCtrl.getStudentById);
router.post('/students', authenticate, requireTeacherOrAdmin, studentCtrl.createStudent);
router.put('/students/:id', authenticate, requireTeacherOrAdmin, studentCtrl.updateStudent);
router.delete('/students/:id', authenticate, requireTeacherOrAdmin, studentCtrl.deleteStudent);

// -------------------------------------------------------------
// 6. TEACHERS
// -------------------------------------------------------------
router.get('/teachers', authenticate, teacherCtrl.getTeachers);
router.post('/teachers', authenticate, requireTeacherOrAdmin, teacherCtrl.createTeacher);
router.put('/teachers/:id', authenticate, requireTeacherOrAdmin, teacherCtrl.updateTeacher);
router.delete('/teachers/:id', authenticate, requireSuperAdmin, teacherCtrl.deleteTeacher);

// -------------------------------------------------------------
// 7. RFID CARDS
// -------------------------------------------------------------
router.get('/rfid', authenticate, requireTeacherOrAdmin, rfidCtrl.getRfidCards);
router.get('/rfid/latest-unknown', authenticate, requireTeacherOrAdmin, rfidCtrl.getLatestUnknownCard);
router.get('/rfid/status/:uid', rfidCtrl.checkCardStatus);
router.post('/rfid/register', authenticate, requireTeacherOrAdmin, rfidCtrl.registerCard);
router.put('/rfid/:id/assign', authenticate, requireTeacherOrAdmin, rfidCtrl.assignCardToStudent);
router.put('/rfid/:id/status', authenticate, requireTeacherOrAdmin, rfidCtrl.updateCardStatus);

// -------------------------------------------------------------
// 8. ATTENDANCE
// -------------------------------------------------------------
router.post('/attendance/scan', attCtrl.handleScan); // open scan or hardware scan
router.get('/attendance', authenticate, attCtrl.getAttendanceRecords);
router.get('/attendance/student/:id', authenticate, attCtrl.getStudentAttendance);
router.get('/attendance/subject-stats', authenticate, attCtrl.getSubjectAttendanceStats);
router.get('/attendance/dashboard-summary', authenticate, attCtrl.getDashboardSummary);
router.put('/attendance/:id', authenticate, requireTeacherOrAdmin, attCtrl.updateAttendance);
router.post('/attendance/finalize', authenticate, requireTeacherOrAdmin, attCtrl.finalizeLecture);

// -------------------------------------------------------------
// 9. TIMETABLES
// -------------------------------------------------------------
router.get('/timetable', ttCtrl.getTimetables);
router.post('/timetable', authenticate, requireTeacherOrAdmin, ttCtrl.createTimetable);
router.put('/timetable/:id', authenticate, requireTeacherOrAdmin, ttCtrl.updateTimetable);
router.delete('/timetable/:id', authenticate, requireTeacherOrAdmin, ttCtrl.deleteTimetable);

// -------------------------------------------------------------
// 10. MARKS
// -------------------------------------------------------------
router.get('/marks', authenticate, marksCtrl.getMarks);
router.get('/marks/export', authenticate, requireTeacherOrAdmin, marksCtrl.exportMarks);
router.get('/marks/student/:id', authenticate, marksCtrl.getStudentConsolidatedMarks);
router.post('/marks', authenticate, requireTeacherOrAdmin, marksCtrl.saveMarks);

// -------------------------------------------------------------
// 11. HARDWARE DEVICES (SUPER ADMIN ONLY FOR CONFIG & EDIT)
// -------------------------------------------------------------
router.get('/devices', authenticate, requireSuperAdmin, devCtrl.getDevices);
router.post('/devices', authenticate, requireSuperAdmin, devCtrl.registerDevice);
router.put('/devices/:id', authenticate, requireSuperAdmin, devCtrl.updateDevice);
router.delete('/devices/:id', authenticate, requireSuperAdmin, devCtrl.deleteDevice);
router.post('/devices/:id/rotate-token', authenticate, requireSuperAdmin, devCtrl.rotateDeviceCredentials);
router.get('/devices/:id/logs', authenticate, requireSuperAdmin, devCtrl.getDeviceLogs);

// Device hardware communication endpoints (authenticated via X-Device-Id + X-Device-Token)
router.post('/devices/heartbeat', authenticateDevice, devCtrl.handleHeartbeat);
router.post('/devices/scan', authenticateDevice, devCtrl.handleDeviceScan);
router.post('/devices/sync-offline', authenticateDevice, devCtrl.handleOfflineSync);

// Simulator endpoint for Super Admin testing only
router.post('/devices/simulate-scan', authenticate, requireSuperAdmin, attCtrl.handleScan);

// -------------------------------------------------------------
// 12. REPORTS & ANALYTICS
// -------------------------------------------------------------
router.get('/reports/analytics', authenticate, requireTeacherOrAdmin, repCtrl.getAnalyticsOverview);
router.get('/reports/export', authenticate, requireTeacherOrAdmin, repCtrl.generateReportData);

// -------------------------------------------------------------
// 13. NOTIFICATIONS
// -------------------------------------------------------------
router.get('/notifications', authenticate, notifCtrl.getMyNotifications);
router.put('/notifications/:id/read', authenticate, notifCtrl.markAsRead);
router.post('/notifications', authenticate, requireTeacherOrAdmin, notifCtrl.createNotification);

// -------------------------------------------------------------
// 14. SUBJECTS & AUDIT LOGS
// -------------------------------------------------------------
router.get('/subjects', authenticate, async (req, res) => {
  try {
    const { departmentId, academicYearId } = req.query;
    let sql = 'SELECT s.*, d.name as department_name, d.code as department_code, ay.name as academic_year_name, ay.year_code FROM subjects s JOIN departments d ON s.department_id = d.id JOIN academic_years ay ON s.academic_year_id = ay.id';
    const params = [];
    const where = [];
    if (departmentId) {
      where.push('s.department_id = ?');
      params.push(departmentId);
    }
    if (academicYearId) {
      where.push('s.academic_year_id = ?');
      params.push(academicYearId);
    }
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY s.id ASC';
    const subjects = await db.query(sql, params);
    res.json({ success: true, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/subjects', authenticate, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { code, name, departmentId, academicYearId, credits = 4, totalHours = 40, semester = 5 } = req.body;
    if (!code || !name || !departmentId || !academicYearId) {
      return res.status(400).json({ success: false, message: 'Subject Code, Name, Department, and Academic Year are required.' });
    }
    const cleanCode = code.trim().toUpperCase();
    const existing = await db.queryOne('SELECT id FROM subjects WHERE UPPER(code) = ?', [cleanCode]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Subject code ${cleanCode} already exists.` });
    }
    const result = await db.query(
      'INSERT INTO subjects (code, name, department_id, academic_year_id, credits, total_hours, semester) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cleanCode, name.trim(), departmentId, academicYearId, credits, totalHours, semester]
    );
    const subjectId = result.insertId;

    // Auto-enroll existing students of this department & academic year
    const matchingStudents = await db.query(
      'SELECT id FROM students WHERE department_id = ? AND academic_year_id = ?',
      [departmentId, academicYearId]
    );
    for (const st of matchingStudents) {
      const existsEnroll = await db.queryOne('SELECT id FROM student_subjects WHERE student_id = ? AND subject_id = ?', [st.id, subjectId]);
      if (!existsEnroll) {
        await db.query('INSERT INTO student_subjects (student_id, subject_id, semester) VALUES (?, ?, ?)', [st.id, subjectId, semester]);
      }
    }

    res.status(201).json({ success: true, message: 'Subject created successfully.', subjectId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/subjects/:id', authenticate, requireTeacherOrAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Subject deleted.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/audit-logs', authenticate, requireTeacherOrAdmin, async (req, res) => {
  try {
    const logs = await db.query(`
      SELECT al.*, u.full_name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.id DESC
      LIMIT 100
    `);
    res.json({ success: true, logs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
