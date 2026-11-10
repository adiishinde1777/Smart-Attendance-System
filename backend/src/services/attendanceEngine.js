const db = require('../config/database');
const { emitAttendanceMarked, emitScanFailure, emitNotification } = require('../config/socket');
const { recordUnknownCardScan } = require('../utils/scanDiagnostics');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalizeUid(uid) {
  return String(uid || '').replace(/[\s:-]+/g, '').trim().toUpperCase();
}

/**
 * Core Automated RFID Attendance Processing Engine
 */
async function processRfidScan({ cardUid, deviceCode, scanEventId = null, isOfflineSync = false, clientTimestamp = null }) {
  const normalizedUid = normalizeUid(cardUid);
  const serverNow = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const serverDate = `${serverNow.getFullYear()}-${pad(serverNow.getMonth() + 1)}-${pad(serverNow.getDate())}`;
  const serverTime = serverNow.toTimeString().split(' ')[0]; // HH:MM:SS
  const currentDayName = DAYS[serverNow.getDay()];

  // 1. Verify Device
  const device = await db.queryOne(`
    SELECT d.*, dep.name as department_name, dv.name as division_name, ay.name as academic_year_name
    FROM esp32_devices d
    JOIN departments dep ON d.department_id = dep.id
    JOIN divisions dv ON d.division_id = dv.id
    JOIN academic_years ay ON d.academic_year_id = ay.id
    WHERE d.device_code = ?
  `, [deviceCode]);

  if (!device || !device.is_active) {
    const errorMsg = 'Unauthorized or inactive ESP32 attendance device.';
    await logScan(device ? device.id : null, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_DEVICE_UNAUTHORIZED',
      message: errorMsg,
      displayMessage: 'Device Invalid'
    };
  }

  // Update device's last_scan_time & status
  await db.query(`UPDATE esp32_devices SET last_scan_time = NOW(), status = 'online' WHERE id = ?`, [device.id]);

  // 2. Identify Student via RFID UID
  const student = await db.queryOne(`
    SELECT s.id as student_id, s.roll_number, s.prn, s.status as student_status,
           s.department_id, s.academic_year_id, s.division_id,
           u.id as user_id, u.full_name, u.email,
           rc.id as card_id, rc.status as card_status, rc.blocked_reason,
           dep.name as department_name, dv.name as division_name
    FROM rfid_cards rc
    LEFT JOIN students s ON s.rfid_card_id = rc.id
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN departments dep ON s.department_id = dep.id
    LEFT JOIN divisions dv ON s.division_id = dv.id
    WHERE UPPER(rc.card_uid) = ?
  `, [normalizedUid]);

  // Check card existence
  if (!student || !student.card_id) {
    const errorMsg = `Unknown ID Card (${normalizedUid}): Not assigned to any student yet.`;
    recordUnknownCardScan({ cardUid: normalizedUid, errorCode: 'ERR_CARD_UNKNOWN' });
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_CARD_UNKNOWN',
      message: errorMsg,
      displayMessage: 'Card Unknown'
    };
  }

  // Check card status
  if (student.card_status === 'blocked') {
    const errorMsg = `RFID Card Blocked: ${student.blocked_reason || 'Reported lost/stolen'}`;
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, studentName: student.full_name, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_CARD_BLOCKED',
      message: errorMsg,
      displayMessage: 'Card Blocked'
    };
  }

  if (student.card_status === 'unassigned' || !student.student_id) {
    const errorMsg = `ID Card (${normalizedUid}) is not assigned to any student yet.`;
    recordUnknownCardScan({ cardUid: normalizedUid, errorCode: 'ERR_CARD_UNASSIGNED' });
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_CARD_UNASSIGNED',
      message: errorMsg,
      displayMessage: 'Unassigned Card'
    };
  }

  // Check student active status
  if (student.student_status !== 'active') {
    const errorMsg = `Student account is ${student.student_status}.`;
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, studentName: student.full_name, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_STUDENT_INACTIVE',
      message: errorMsg,
      displayMessage: 'Student Inactive'
    };
  }

  // 3. Check division matching device's class
  if (student.division_id !== device.division_id) {
    const errorMsg = `Student belongs to ${student.division_name}, but this device is assigned to ${device.division_name}.`;
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, studentName: student.full_name, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_DIVISION_MISMATCH',
      message: errorMsg,
      displayMessage: 'Wrong Division'
    };
  }

  // 4. Retrieve Active Timetable Lecture for Device / Division
  // We query all timetables for this division on currentDayName
  const timetableSlots = await db.query(`
    SELECT t.*, sub.name as subject_name, sub.code as subject_code,
           u.full_name as teacher_name
    FROM timetables t
    JOIN subjects sub ON t.subject_id = sub.id
    JOIN teachers tch ON t.teacher_id = tch.id
    JOIN users u ON tch.user_id = u.id
    WHERE t.division_id = ? AND t.day_of_week = ?
    ORDER BY (TIME(t.end_time) - TIME(t.start_time)) ASC
  `, [device.division_id, currentDayName]);

  // Find slot that includes serverTime: start_time <= serverTime <= end_time
  let activeSlot = null;
  if (timetableSlots && timetableSlots.length > 0) {
    activeSlot = timetableSlots.find(slot => {
      return serverTime >= slot.start_time && serverTime <= slot.end_time;
    });

    // If no hourly slot matches exactly, pick the first slot of the day or wide slot if available
    if (!activeSlot && timetableSlots.length > 0) {
      activeSlot = timetableSlots.find(slot => slot.start_time === '00:00:00' && slot.end_time === '23:59:59') || timetableSlots[0];
    }
  }

  if (!activeSlot) {
    const errorMsg = `No active lecture scheduled for ${device.division_name} on ${currentDayName} at ${serverTime}.`;
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, studentName: student.full_name, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_NO_ACTIVE_LECTURE',
      message: errorMsg,
      displayMessage: 'No Active Lecture'
    };
  }

  // 5. Prevent Duplicate Attendance for this lecture on this date
  const existingAttendance = await db.queryOne(`
    SELECT a.*, sub.name as subject_name
    FROM attendance a
    JOIN subjects sub ON a.subject_id = sub.id
    WHERE a.student_id = ? AND a.timetable_id = ? AND a.lecture_date = ?
  `, [student.student_id, activeSlot.id, serverDate]);

  if (existingAttendance) {
    const errorMsg = `Attendance already recorded for ${student.full_name} (${activeSlot.subject_name}) at ${existingAttendance.scan_time}.`;
    await logScan(device.id, normalizedUid, scanEventId, false, errorMsg);
    emitScanFailure({ deviceCode, cardUid: normalizedUid, studentName: student.full_name, reason: errorMsg, timestamp: serverNow });
    return {
      success: false,
      errorCode: 'ERR_DUPLICATE_ATTENDANCE',
      message: errorMsg,
      studentName: student.full_name,
      subjectName: activeSlot.subject_name,
      displayMessage: 'Already Marked'
    };
  }

  // 6. Calculate Late Rule
  // If scan is > 15 minutes after start time, mark 'Late'
  let attendanceStatus = 'Present';
  try {
    const [startH, startM] = activeSlot.start_time.split(':').map(Number);
    const [curH, curM] = serverTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const curMins = curH * 60 + curM;
    if (curMins > startMins + 15 && activeSlot.start_time !== '00:00:00') {
      attendanceStatus = 'Late';
    }
  } catch (e) {
    attendanceStatus = 'Present';
  }

  // 7. Save Attendance in Relational Database
  const verificationMethod = isOfflineSync ? 'offline_sync' : 'rfid';
  const attRes = await db.query(`
    INSERT INTO attendance (student_id, subject_id, timetable_id, lecture_date, scan_time, status, device_id, verification_method, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    student.student_id,
    activeSlot.subject_id,
    activeSlot.id,
    serverDate,
    serverTime,
    attendanceStatus,
    device.id,
    verificationMethod,
    isOfflineSync ? `Synced from offline device queue (${scanEventId || 'unknown'})` : 'RFID Card Scan via ESP32'
  ]);

  // Log successful scan
  await logScan(device.id, normalizedUid, scanEventId, true, null);

  // 8. Emit Real-time Socket.IO Events
  const payload = {
    attendanceId: attRes.insertId,
    studentId: student.student_id,
    studentName: student.full_name,
    rollNumber: student.roll_number,
    prn: student.prn,
    departmentName: student.department_name,
    divisionName: student.division_name,
    subjectName: activeSlot.subject_name,
    subjectCode: activeSlot.subject_code,
    status: attendanceStatus,
    scanTime: serverTime,
    lectureDate: serverDate,
    classroom: activeSlot.classroom,
    teacherName: activeSlot.teacher_name,
    deviceCode: device.device_code,
    timestamp: serverNow
  };

  emitAttendanceMarked(payload);

  // Create student notification
  await db.query(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Attendance Marked', ?, 'attendance')
  `, [
    student.user_id,
    `Your attendance for ${activeSlot.subject_name} has been marked as ${attendanceStatus} at ${serverTime}.`
  ]);

  emitNotification(student.user_id, {
    title: 'Attendance Marked',
    message: `Your attendance for ${activeSlot.subject_name} was recorded as ${attendanceStatus}.`,
    time: serverTime
  });

  // 9. Return Expected ESP32 Response per specification
  return {
    success: true,
    studentName: student.full_name,
    rollNumber: student.roll_number,
    subjectName: activeSlot.subject_name,
    attendanceStatus,
    serverTimestamp: serverNow.toISOString(),
    displayMessage: `${student.full_name.split(' ')[0]}: Present!`
  };
}

async function logScan(deviceId, cardUid, scanEventId, isSuccess, failureReason) {
  try {
    await db.query(`
      INSERT INTO device_scan_logs (device_id, card_uid, scan_event_id, is_success, failure_reason)
      VALUES (?, ?, ?, ?, ?)
    `, [
      deviceId,
      cardUid,
      scanEventId || `EVT-${Date.now()}`,
      isSuccess ? 1 : 0,
      failureReason || null
    ]);
  } catch (err) {
    console.error('[LOG SCAN ERROR]', err.message);
  }
}

/**
 * Synchronize offline batch queue from ESP32
 */
async function syncOfflineQueue(deviceCode, queueItems = []) {
  const results = [];
  for (const item of queueItems) {
    const res = await processRfidScan({
      cardUid: item.cardUid || item.uid,
      deviceCode,
      scanEventId: item.scanEventId || item.eventId,
      isOfflineSync: true,
      clientTimestamp: item.timestamp
    });
    results.push({
      eventId: item.scanEventId || item.eventId,
      cardUid: item.cardUid || item.uid,
      success: res.success,
      message: res.message || res.displayMessage
    });
  }
  return results;
}

module.exports = {
  processRfidScan,
  syncOfflineQueue
};
