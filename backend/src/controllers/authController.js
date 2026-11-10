const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { signToken } = require('../config/jwt');
const { logAudit } = require('../middleware/auditLogger');

async function login(req, res) {
  try {
    const { email, password, loginIdentifier } = req.body;
    const identifier = (email || loginIdentifier || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email or PRN and password.' });
    }

    // Allow login by email or student PRN
    const user = await db.queryOne(`
      SELECT u.*, r.name as role_name,
             s.id as student_id, s.prn, s.roll_number, s.department_id as student_dept_id,
             t.id as teacher_id, t.employee_code, t.department_id as teacher_dept_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      WHERE LOWER(u.email) = LOWER(?) OR UPPER(s.prn) = UPPER(?)
    `, [identifier, identifier]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: `Your account is ${user.status}. Please contact administrator.` });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password entered.' });
    }

    const token = signToken({
      id: user.id,
      role: user.role_name,
      email: user.email,
      name: user.full_name
    });

    // Strip sensitive fields
    delete user.password_hash;

    await logAudit(user.id, 'USER_LOGIN', 'users', user.id, null, { role: user.role_name }, req);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

async function getMe(req, res) {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching session user.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await db.queryOne('SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with that email address.' });
    }

    // In production, would send SMTP token email. Here, we generate a reset confirmation:
    res.json({
      success: true,
      message: `Password reset instructions sent to registered email ${user.email}. Contact college IT admin if needed.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing forgot password.' });
  }
}

async function logout(req, res) {
  if (req.user) {
    await logAudit(req.user.id, 'USER_LOGOUT', 'users', req.user.id, null, null, req);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
}

module.exports = {
  login,
  getMe,
  forgotPassword,
  logout
};
