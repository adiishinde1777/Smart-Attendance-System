const crypto = require('crypto');
const db = require('../config/database');
const { logAudit } = require('../middleware/auditLogger');
const { emitDeviceHeartbeat } = require('../config/socket');
const { processRfidScan, syncOfflineQueue } = require('../services/attendanceEngine');
const {
  clearUnregisteredDeviceAttempt,
  getUnregisteredDeviceAttempts
} = require('../utils/scanDiagnostics');

async function getDevices(req, res) {
  try {
    const devices = await db.query(`
      SELECT d.*,
             dep.name as department_name, dep.code as department_code,
             ay.name as academic_year_name,
             dv.name as division_name,
             dc.api_token_raw, dc.secret_key, dc.rotated_at,
             (SELECT COUNT(*) FROM device_scan_logs l WHERE l.device_id = d.id AND l.is_success = 1) as success_scans_count,
             (SELECT COUNT(*) FROM device_scan_logs l WHERE l.device_id = d.id AND l.is_success = 0) as failed_scans_count
      FROM esp32_devices d
      JOIN departments dep ON d.department_id = dep.id
      JOIN academic_years ay ON d.academic_year_id = ay.id
      JOIN divisions dv ON d.division_id = dv.id
      LEFT JOIN device_credentials dc ON d.id = dc.device_id
      ORDER BY d.id ASC
    `);

    // Determine online / offline dynamically (if heartbeat older than 5 minutes, flag as offline)
    const now = Date.now();
    const evaluated = devices.map(dev => {
      let isOnline = dev.status === 'online';
      if (dev.last_heartbeat) {
        const lastHb = new Date(dev.last_heartbeat).getTime();
        if (now - lastHb > 5 * 60 * 1000) {
          isOnline = false;
        }
      } else {
        isOnline = false;
      }
      return {
        ...dev,
        status: isOnline ? 'online' : 'offline'
      };
    });

    res.json({
      success: true,
      devices: evaluated,
      unregisteredAttempts: getUnregisteredDeviceAttempts()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve devices: ' + err.message });
  }
}

async function registerDevice(req, res) {
  try {
    const { deviceCode, name, departmentId, academicYearId, divisionId, classroom, ipAddress, macAddress, apiToken } = req.body;
    if (!deviceCode || !name || !departmentId || !academicYearId || !divisionId || !classroom) {
      return res.status(400).json({ success: false, message: 'Device Code, Name, Department, Year, Division, and Classroom are required.' });
    }

    const cleanCode = deviceCode.trim().toUpperCase();
    const existing = await db.queryOne('SELECT id FROM esp32_devices WHERE UPPER(device_code) = ?', [cleanCode]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Device Code ${cleanCode} is already registered.` });
    }

    // Use provided custom token (if entered) or generate secure device credentials
    const rawToken = (apiToken && apiToken.trim()) ? apiToken.trim() : ('esp32_tok_' + crypto.randomBytes(12).toString('hex'));
    const secretKey = 'sec_' + crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const devRes = await db.query(`
      INSERT INTO esp32_devices (device_code, name, department_id, academic_year_id, division_id, classroom, ip_address, mac_address, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'offline', 1)
    `, [cleanCode, name.trim(), departmentId, academicYearId, divisionId, classroom.trim(), ipAddress || null, macAddress || null]);
    const deviceId = devRes.insertId;

    await db.query(`
      INSERT INTO device_credentials (device_id, api_token_hash, api_token_raw, secret_key)
      VALUES (?, ?, ?, ?)
    `, [deviceId, tokenHash, rawToken, secretKey]);

    await logAudit(req.user ? req.user.id : null, 'REGISTER_DEVICE', 'esp32_devices', deviceId, null, { deviceCode: cleanCode, classroom }, req);
    clearUnregisteredDeviceAttempt(cleanCode);

    res.status(201).json({
      success: true,
      message: 'ESP32 Device registered successfully.',
      device: {
        id: deviceId,
        deviceCode: cleanCode,
        apiToken: rawToken,
        secretKey
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register device: ' + err.message });
  }
}

async function rotateDeviceCredentials(req, res) {
  try {
    const { id } = req.params;
    const device = await db.queryOne('SELECT * FROM esp32_devices WHERE id = ?', [id]);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found.' });

    const newRawToken = 'esp32_tok_' + crypto.randomBytes(12).toString('hex');
    const newSecretKey = 'sec_' + crypto.randomBytes(16).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');

    await db.query(`
      UPDATE device_credentials
      SET api_token_hash = ?,
          api_token_raw = ?,
          secret_key = ?,
          rotated_at = NOW()
      WHERE device_id = ?
    `, [newTokenHash, newRawToken, newSecretKey, id]);

    await logAudit(req.user.id, 'ROTATE_DEVICE_CREDENTIALS', 'esp32_devices', id, null, { deviceCode: device.device_code }, req);

    res.json({
      success: true,
      message: 'Device credentials rotated successfully.',
      apiToken: newRawToken,
      secretKey: newSecretKey
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to rotate credentials: ' + err.message });
  }
}

async function updateDevice(req, res) {
  try {
    const { id } = req.params;
    const { deviceCode, name, departmentId, academicYearId, divisionId, classroom, ipAddress, isActive, apiToken } = req.body;

    const old = await db.queryOne('SELECT * FROM esp32_devices WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Device not found.' });

    const cleanCode = deviceCode ? deviceCode.trim().toUpperCase() : null;
    await db.query(`
      UPDATE esp32_devices
      SET device_code = COALESCE(?, device_code),
          name = COALESCE(?, name),
          department_id = COALESCE(?, department_id),
          academic_year_id = COALESCE(?, academic_year_id),
          division_id = COALESCE(?, division_id),
          classroom = COALESCE(?, classroom),
          ip_address = COALESCE(?, ip_address),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [cleanCode, name, departmentId, academicYearId, divisionId, classroom, ipAddress, isActive !== undefined ? (isActive ? 1 : 0) : null, id]);

    if (apiToken && apiToken.trim()) {
      const tokenHash = crypto.createHash('sha256').update(apiToken.trim()).digest('hex');
      await db.query(`
        UPDATE device_credentials
        SET api_token_hash = ?, api_token_raw = ?, rotated_at = NOW()
        WHERE device_id = ?
      `, [tokenHash, apiToken.trim(), id]);
    }

    await logAudit(req.user.id, 'UPDATE_DEVICE', 'esp32_devices', id, old, req.body, req);
    clearUnregisteredDeviceAttempt(cleanCode || old.device_code);
    res.json({ success: true, message: 'Hardware device settings updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update device: ' + err.message });
  }
}

async function deleteDevice(req, res) {
  try {
    const { id } = req.params;
    const old = await db.queryOne('SELECT * FROM esp32_devices WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Device not found.' });

    await db.query('DELETE FROM esp32_devices WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_DEVICE', 'esp32_devices', id, old, null, req);
    res.json({ success: true, message: 'ESP32 Device unregistered.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete device.' });
  }
}

async function handleHeartbeat(req, res) {
  try {
    // Authenticated via deviceAuth middleware or request payload
    const device = req.device;
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const ip = String(rawIp).replace(/^::ffff:/i, '') || null;
    const { wifiRssi, freeHeap } = req.body;

    await db.query(`
      UPDATE esp32_devices
      SET status = 'online',
          last_heartbeat = NOW(),
          ip_address = COALESCE(?, ip_address)
      WHERE id = ?
    `, [ip || null, device.id]);

    emitDeviceHeartbeat({
      deviceId: device.id,
      deviceCode: device.device_code,
      classroom: device.classroom,
      status: 'online',
      wifiRssi,
      freeHeap,
      lastHeartbeat: new Date().toISOString()
    });

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      status: 'online',
      command: 'NONE'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Heartbeat error.' });
  }
}

async function getDeviceLogs(req, res) {
  try {
    const { id } = req.params;
    const logs = await db.query(`
      SELECT l.*, dev.device_code, dev.classroom
      FROM device_scan_logs l
      LEFT JOIN esp32_devices dev ON l.device_id = dev.id
      WHERE l.device_id = ?
      ORDER BY l.scanned_at DESC
      LIMIT 100
    `, [id]);

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve device logs.' });
  }
}

async function handleDeviceScan(req, res) {
  try {
    const device = req.device;
    const { cardUid, scanEventId } = req.body;

    if (!cardUid) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERR_NO_UID',
        message: 'No RFID UID provided.',
        displayMessage: 'Scan Error'
      });
    }

    const result = await processRfidScan({
      cardUid,
      deviceCode: device.device_code,
      scanEventId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, errorCode: 'ERR_INTERNAL', message: err.message });
  }
}

async function handleOfflineSync(req, res) {
  try {
    const device = req.device;
    const { queue } = req.body; // Array of { cardUid, scanEventId, timestamp }

    if (!Array.isArray(queue) || queue.length === 0) {
      return res.status(400).json({ success: false, message: 'Queue must be a non-empty array.' });
    }

    const results = await syncOfflineQueue(device.device_code, queue);
    res.json({
      success: true,
      message: `Synchronized ${results.length} offline scans.`,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Offline sync failed: ' + err.message });
  }
}

module.exports = {
  getDevices,
  registerDevice,
  rotateDeviceCredentials,
  updateDevice,
  deleteDevice,
  handleHeartbeat,
  getDeviceLogs,
  handleDeviceScan,
  handleOfflineSync
};
