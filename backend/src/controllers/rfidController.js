const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');
const { clearUnknownCardScan, getLatestUnknownCardScan } = require('../utils/scanDiagnostics');

function normalizeUid(uid) {
  return String(uid || '').replace(/[\s:-]+/g, '').trim().toUpperCase();
}

async function getRfidCards(req, res) {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT rc.*,
             s.id as student_id, s.roll_number, s.prn,
             u.full_name as student_name, u.email as student_email,
             d.name as department_name, dv.name as division_name
      FROM rfid_cards rc
      LEFT JOIN students s ON s.rfid_card_id = rc.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN divisions dv ON s.division_id = dv.id
    `;
    const params = [];
    const where = [];

    if (status) {
      where.push('rc.status = ?');
      params.push(status);
    }
    if (search) {
      where.push('(UPPER(rc.card_uid) LIKE ? OR LOWER(u.full_name) LIKE ? OR UPPER(s.prn) LIKE ?)');
      const term = `%${search.toUpperCase()}%`;
      const termLower = `%${search.toLowerCase()}%`;
      params.push(term, termLower, term);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY rc.id DESC';

    const cards = await db.query(sql, params);
    res.json({ success: true, cards });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve RFID cards.' });
  }
}

async function registerCard(req, res) {
  try {
    const { cardUid, studentId } = req.body;
    if (!cardUid) return res.status(400).json({ success: false, message: 'RFID Card UID is required.' });

    const cleanUid = normalizeUid(cardUid);
    const existing = await db.queryOne('SELECT id FROM rfid_cards WHERE UPPER(card_uid) = ?', [cleanUid]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Card UID ${cleanUid} is already registered in the system.` });
    }

    const cardStatus = studentId ? 'active' : 'unassigned';
    const cardRes = studentId
      ? await db.query(`INSERT INTO rfid_cards (card_uid, status, issued_at) VALUES (?, ?, NOW())`, [cleanUid, cardStatus])
      : await db.query(`INSERT INTO rfid_cards (card_uid, status, issued_at) VALUES (?, ?, NULL)`, [cleanUid, cardStatus]);
    const cardId = cardRes.insertId;

    if (studentId) {
      // Check if student already had a card
      const student = await db.queryOne('SELECT rfid_card_id FROM students WHERE id = ?', [studentId]);
      if (student && student.rfid_card_id) {
        await db.query('UPDATE rfid_cards SET status = "unassigned" WHERE id = ?', [student.rfid_card_id]);
      }
      await db.query('UPDATE students SET rfid_card_id = ? WHERE id = ?', [cardId, studentId]);
    }

    clearUnknownCardScan(cleanUid);
    await logAudit(req.user.id, 'REGISTER_RFID_CARD', 'rfid_cards', cardId, null, { cardUid: cleanUid, studentId }, req);
    res.status(201).json({ success: true, message: 'RFID card registered successfully.', cardId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register RFID card: ' + err.message });
  }
}

async function assignCardToStudent(req, res) {
  try {
    const { id } = req.params; // card id
    const { studentId } = req.body;

    const card = await db.queryOne('SELECT * FROM rfid_cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ success: false, message: 'Card not found.' });

    if (card.status === 'blocked') {
      return res.status(400).json({ success: false, message: 'Cannot assign a blocked card. Unblock or re-activate it first.' });
    }

    // Unassign old student's card if this card belonged to someone
    await db.query('UPDATE students SET rfid_card_id = NULL WHERE rfid_card_id = ?', [id]);

    if (studentId) {
      // Unassign target student's existing card
      const targetStudent = await db.queryOne('SELECT rfid_card_id FROM students WHERE id = ?', [studentId]);
      if (targetStudent && targetStudent.rfid_card_id && targetStudent.rfid_card_id !== parseInt(id, 10)) {
        await db.query('UPDATE rfid_cards SET status = "unassigned" WHERE id = ?', [targetStudent.rfid_card_id]);
      }

      await db.query('UPDATE students SET rfid_card_id = ? WHERE id = ?', [id, studentId]);
      await db.query('UPDATE rfid_cards SET status = "active", issued_at = NOW() WHERE id = ?', [id]);
    } else {
      // Explicit unassign
      await db.query('UPDATE rfid_cards SET status = "unassigned" WHERE id = ?', [id]);
    }

    await logAudit(req.user.id, 'ASSIGN_RFID_CARD', 'rfid_cards', id, null, { studentId }, req);
    res.json({ success: true, message: studentId ? 'RFID card assigned to student successfully.' : 'RFID card unassigned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update card assignment: ' + err.message });
  }
}

async function updateCardStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, blockedReason } = req.body; // 'active', 'blocked', 'unassigned'

    const card = await db.queryOne('SELECT * FROM rfid_cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ success: false, message: 'Card not found.' });

    await db.query(`
      UPDATE rfid_cards
      SET status = ?,
          blocked_reason = ?
      WHERE id = ?
    `, [status, status === 'blocked' ? (blockedReason || 'Blocked by administrator') : null, id]);

    await logAudit(req.user.id, 'UPDATE_RFID_STATUS', 'rfid_cards', id, card, { status, blockedReason }, req);
    res.json({ success: true, message: `Card status changed to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update card status.' });
  }
}

async function checkCardStatus(req, res) {
  try {
    const { uid } = req.params;
    const card = await db.queryOne(`
      SELECT rc.*,
             s.id as student_id, s.roll_number, s.prn,
             u.full_name as student_name,
             d.name as department_name, dv.name as division_name
      FROM rfid_cards rc
      LEFT JOIN students s ON s.rfid_card_id = rc.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN divisions dv ON s.division_id = dv.id
      WHERE UPPER(rc.card_uid) = ?
    `, [normalizeUid(uid)]);

    if (!card) {
      return res.status(404).json({ success: false, isRegistered: false, message: 'Card UID is not registered.' });
    }

    res.json({ success: true, isRegistered: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error checking card status.' });
  }
}

async function getLatestUnknownCard(req, res) {
  try {
    res.json({
      success: true,
      latestCardScan: getLatestUnknownCardScan()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error checking latest scanned card.' });
  }
}

module.exports = {
  getRfidCards,
  registerCard,
  assignCardToStudent,
  updateCardStatus,
  checkCardStatus,
  getLatestUnknownCard
};
