const { verifyToken } = require('../config/jwt');
const db = require('../config/database');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please provide a valid Bearer token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }

    // Query active user
    const user = await db.queryOne(`
      SELECT u.id, u.email, u.full_name, u.role_id, u.status, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [decoded.id]);

    if (!user || user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User account is inactive or not found.' });
    }

    // Attach student or teacher profile if relevant
    if (user.role_name === 'student') {
      const student = await db.queryOne(`
        SELECT s.id as student_id, s.roll_number, s.prn, s.department_id, s.academic_year_id, s.division_id, s.rfid_card_id,
               d.name as department_name, d.code as department_code,
               ay.name as academic_year_name, ay.year_code,
               dv.name as division_name,
               rc.card_uid, rc.status as rfid_status
        FROM students s
        JOIN departments d ON s.department_id = d.id
        JOIN academic_years ay ON s.academic_year_id = ay.id
        JOIN divisions dv ON s.division_id = dv.id
        LEFT JOIN rfid_cards rc ON s.rfid_card_id = rc.id
        WHERE s.user_id = ?
      `, [user.id]);
      user.student = student;
    } else if (user.role_name === 'teacher') {
      const teacher = await db.queryOne(`
        SELECT t.id as teacher_id, t.employee_code, t.department_id, t.designation,
               d.name as department_name, d.code as department_code
        FROM teachers t
        JOIN departments d ON t.department_id = d.id
        WHERE t.user_id = ?
      `, [user.id]);
      user.teacher = teacher;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ success: false, message: 'Internal server error in authentication.' });
  }
}

module.exports = {
  authenticate
};
