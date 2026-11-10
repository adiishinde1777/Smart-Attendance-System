function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Login required.' });
    }

    const userRole = req.user.role_name;
    if (allowedRoles.includes(userRole) || userRole === 'super_admin') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
    });
  };
}

module.exports = {
  requireRole,
  requireSuperAdmin: requireRole('super_admin'),
  requireTeacherOrAdmin: requireRole('teacher', 'admin', 'super_admin'),
  requireStudent: requireRole('student')
};
