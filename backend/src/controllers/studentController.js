const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');
const { clearUnknownCardScan } = require('../utils/scanDiagnostics');

function normalizeUid(uid) {
  return String(uid || '').replace(/[\s:-]+/g, '').trim().toUpperCase();
}
const xlsx = require('xlsx');

async function getStudents(req, res) {
  try {
    const { departmentId, academicYearId, divisionId, search, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereClauses = [];
    let params = [];

    if (departmentId) {
      whereClauses.push('s.department_id = ?');
      params.push(departmentId);
    }
    if (academicYearId) {
      whereClauses.push('s.academic_year_id = ?');
      params.push(academicYearId);
    }
    if (divisionId) {
      whereClauses.push('s.division_id = ?');
      params.push(divisionId);
    }
    if (status) {
      whereClauses.push('s.status = ?');
      params.push(status);
    }
    if (search) {
      whereClauses.push('(LOWER(u.full_name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR UPPER(s.prn) LIKE ? OR UPPER(rc.card_uid) LIKE ?)');
      const sTerm = `%${search.toLowerCase()}%`;
      params.push(sTerm, sTerm, `%${search.toUpperCase()}%`, `%${search.toUpperCase()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN rfid_cards rc ON s.rfid_card_id = rc.id
      ${whereSql}
    `;
    const countRow = await db.queryOne(countQuery, params);
    const total = countRow ? (countRow.total ?? countRow['COUNT(DISTINCT s.id)'] ?? 0) : 0;

    // Fetch records
    const studentsQuery = `
      SELECT s.id as student_id, s.roll_number, s.prn, s.status, s.created_at,
             u.id as user_id, u.full_name, u.email, u.phone, u.avatar_url,
             d.id as department_id, d.name as department_name, d.code as department_code,
             ay.id as academic_year_id, ay.name as academic_year_name, ay.year_code,
             dv.id as division_id, dv.name as division_name,
             rc.id as rfid_card_id, rc.card_uid, rc.status as rfid_status,
             (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status IN ('Present', 'Late')) as present_count,
             (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id) as total_attendance_lectures
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.department_id = d.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      JOIN divisions dv ON s.division_id = dv.id
      LEFT JOIN rfid_cards rc ON s.rfid_card_id = rc.id
      ${whereSql}
      ORDER BY s.department_id ASC, s.academic_year_id ASC, s.division_id ASC, CAST(s.roll_number AS UNSIGNED) ASC
      LIMIT ? OFFSET ?
    `;

    const students = await db.query(studentsQuery, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

    // Calculate percentage on the fly
    const list = students.map(st => {
      const totalLec = st.total_attendance_lectures || 0;
      const presLec = st.present_count || 0;
      const percentage = totalLec > 0 ? ((presLec / totalLec) * 100).toFixed(1) : '0.0';
      return {
        ...st,
        attendance_percentage: parseFloat(percentage),
        is_shortage: parseFloat(percentage) < 75.0 && totalLec > 5
      };
    });

    res.json({
      success: true,
      students: list,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('[GET STUDENTS ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve students: ' + err.message });
  }
}

async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    const student = await db.queryOne(`
      SELECT s.*,
             u.full_name, u.email, u.phone, u.avatar_url,
             d.name as department_name, d.code as department_code,
             ay.name as academic_year_name, ay.year_code,
             dv.name as division_name,
             rc.card_uid, rc.status as rfid_status
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.department_id = d.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      JOIN divisions dv ON s.division_id = dv.id
      LEFT JOIN rfid_cards rc ON s.rfid_card_id = rc.id
      WHERE s.id = ?
    `, [id]);

    if (!student) return res.status(404).json({ success: false, message: 'Student record not found.' });

    // Subject attendance stats
    const subjectStats = await db.query(`
      SELECT sub.id as subject_id, sub.code, sub.name as subject_name,
             COUNT(a.id) as total_lectures,
             SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as attended_lectures
      FROM student_subjects ss
      JOIN subjects sub ON ss.subject_id = sub.id
      LEFT JOIN attendance a ON a.student_id = ss.student_id AND a.subject_id = sub.id
      WHERE ss.student_id = ?
      GROUP BY sub.id
    `, [id]);

    // Marks overview
    const marks = await db.query(`
      SELECT m.*, e.name as exam_name, e.code as exam_code, sub.name as subject_name, sub.code as subject_code
      FROM marks m
      JOIN examinations e ON m.examination_id = e.id
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.student_id = ?
      ORDER BY sub.id ASC, e.id ASC
    `, [id]);

    res.json({
      success: true,
      student,
      subjectStats,
      marks
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch student details.' });
  }
}

async function createStudent(req, res) {
  try {
    const {
      fullName, email, password, phone, rollNumber, prn,
      departmentId, academicYearId, divisionId, cardUid, status
    } = req.body;

    if (!fullName || !email || !rollNumber || !prn || !departmentId || !academicYearId || !divisionId) {
      return res.status(400).json({ success: false, message: 'Required fields: Full Name, Email, Roll Number, PRN, Department, Year, Division.' });
    }

    // Check PRN and Email uniqueness
    const existingUser = await db.queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const existingPrn = await db.queryOne('SELECT id FROM students WHERE UPPER(prn) = UPPER(?)', [prn]);
    if (existingPrn) {
      return res.status(400).json({ success: false, message: 'PRN number is already assigned to another student.' });
    }

    // Handle RFID card
    let rfidCardId = null;
    if (cardUid) {
      const cleanUid = normalizeUid(cardUid);
      let existingCard = await db.queryOne('SELECT id, status FROM rfid_cards WHERE UPPER(card_uid) = ?', [cleanUid]);
      if (!existingCard) {
        const newCard = await db.query('INSERT INTO rfid_cards (card_uid, status, issued_at) VALUES (?, "active", NOW())', [cleanUid]);
        rfidCardId = newCard.insertId;
      } else {
        // Check if assigned
        const cardOccupied = await db.queryOne('SELECT id FROM students WHERE rfid_card_id = ?', [existingCard.id]);
        if (cardOccupied) {
          return res.status(400).json({ success: false, message: `RFID UID ${cleanUid} is already assigned to another student.` });
        }
        await db.query('UPDATE rfid_cards SET status = "active", issued_at = NOW() WHERE id = ?', [existingCard.id]);
        rfidCardId = existingCard.id;
      }
      clearUnknownCardScan(cleanUid);
    }

    // Create user
    const defaultPassword = password || 'Student@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const userRes = await db.query(`
      INSERT INTO users (role_id, email, password_hash, full_name, phone, status)
      VALUES (3, ?, ?, ?, ?, ?)
    `, [email.toLowerCase().trim(), passwordHash, fullName.trim(), phone || null, status || 'active']);
    const userId = userRes.insertId;

    // Create student
    const studentRes = await db.query(`
      INSERT INTO students (user_id, roll_number, prn, department_id, academic_year_id, division_id, rfid_card_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, rollNumber.trim(), prn.toUpperCase().trim(), departmentId, academicYearId, divisionId, rfidCardId, status || 'active']);
    const studentId = studentRes.insertId;

    // Auto-enroll in subjects for that department and academic year
    const subjects = await db.query('SELECT id FROM subjects WHERE department_id = ? AND academic_year_id = ?', [departmentId, academicYearId]);
    for (const sub of subjects) {
      await db.query('INSERT INTO student_subjects (student_id, subject_id) VALUES (?, ?)', [studentId, sub.id]);
    }

    await logAudit(req.user.id, 'CREATE_STUDENT', 'students', studentId, null, { rollNumber, prn, fullName, email }, req);

    res.status(201).json({
      success: true,
      message: 'Student account created and enrolled successfully.',
      studentId
    });
  } catch (err) {
    console.error('[CREATE STUDENT ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to create student: ' + err.message });
  }
}

async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const {
      fullName, email, phone, rollNumber, prn,
      departmentId, academicYearId, divisionId, cardUid, status, password
    } = req.body;

    const student = await db.queryOne('SELECT s.*, u.email as old_email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?', [id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Handle RFID card update
    let rfidCardId = student.rfid_card_id;
    if (cardUid !== undefined) {
      if (!cardUid || cardUid.trim() === '') {
        // Unassign card
        if (student.rfid_card_id) {
          await db.query('UPDATE rfid_cards SET status = "unassigned" WHERE id = ?', [student.rfid_card_id]);
        }
        rfidCardId = null;
      } else {
        const cleanUid = normalizeUid(cardUid);
        let existingCard = await db.queryOne('SELECT id FROM rfid_cards WHERE UPPER(card_uid) = ?', [cleanUid]);
        if (!existingCard) {
          const newCard = await db.query('INSERT INTO rfid_cards (card_uid, status, issued_at) VALUES (?, "active", NOW())', [cleanUid]);
          rfidCardId = newCard.insertId;
        } else {
          // Check if assigned to another student
          const occupied = await db.queryOne('SELECT id FROM students WHERE rfid_card_id = ? AND id != ?', [existingCard.id, id]);
          if (occupied) {
            return res.status(400).json({ success: false, message: `Card ${cleanUid} is currently assigned to another student.` });
          }
          await db.query('UPDATE rfid_cards SET status = "active", issued_at = NOW() WHERE id = ?', [existingCard.id]);
          rfidCardId = existingCard.id;
        }
        clearUnknownCardScan(cleanUid);
      }
    }

    // Update user
    let pwUpdateSql = '';
    let userParams = [fullName, email ? email.toLowerCase().trim() : null, phone, status];
    if (password && password.trim().length >= 6) {
      const hash = await bcrypt.hash(password.trim(), 10);
      pwUpdateSql = ', password_hash = ?';
      userParams.push(hash);
    }
    userParams.push(student.user_id);

    await db.query(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          phone = ?,
          status = COALESCE(?, status)
          ${pwUpdateSql}
      WHERE id = ?
    `, userParams);

    // Update student
    await db.query(`
      UPDATE students
      SET roll_number = COALESCE(?, roll_number),
          prn = COALESCE(?, prn),
          department_id = COALESCE(?, department_id),
          academic_year_id = COALESCE(?, academic_year_id),
          division_id = COALESCE(?, division_id),
          rfid_card_id = ?,
          status = COALESCE(?, status)
      WHERE id = ?
    `, [rollNumber, prn ? prn.toUpperCase().trim() : null, departmentId, academicYearId, divisionId, rfidCardId, status, id]);

    await logAudit(req.user.id, 'UPDATE_STUDENT', 'students', id, student, req.body, req);

    res.json({ success: true, message: 'Student information updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update student: ' + err.message });
  }
}

async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    const student = await db.queryOne('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Free RFID card if assigned
    if (student.rfid_card_id) {
      await db.query('UPDATE rfid_cards SET status = "unassigned" WHERE id = ?', [student.rfid_card_id]);
    }

    // Delete student and associated user
    await db.query('DELETE FROM students WHERE id = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [student.user_id]);

    await logAudit(req.user.id, 'DELETE_STUDENT', 'students', id, student, null, req);
    res.json({ success: true, message: 'Student record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete student.' });
  }
}

async function exportStudents(req, res) {
  try {
    const { departmentId, academicYearId, divisionId } = req.query;
    let sql = `
      SELECT s.roll_number as "Roll Number", s.prn as "PRN",
             u.full_name as "Full Name", u.email as "Email", u.phone as "Phone",
             d.name as "Department", ay.name as "Academic Year", dv.name as "Division",
             rc.card_uid as "RFID UID", s.status as "Status"
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON s.department_id = d.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      JOIN divisions dv ON s.division_id = dv.id
      LEFT JOIN rfid_cards rc ON s.rfid_card_id = rc.id
    `;
    const params = [];
    if (departmentId) {
      sql += ' WHERE s.department_id = ?';
      params.push(departmentId);
    }
    sql += ' ORDER BY CAST(s.roll_number AS UNSIGNED) ASC';

    const rows = await db.query(sql, params);
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Students');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Students_List.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Export failed: ' + err.message });
  }
}

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  exportStudents
};
