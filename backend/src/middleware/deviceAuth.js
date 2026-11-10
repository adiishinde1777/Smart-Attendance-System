const db = require('../config/database');
const { emitScanFailure } = require('../config/socket');
const { recordUnregisteredDeviceAttempt, recordUnknownCardScan } = require('../utils/scanDiagnostics');

async function authenticateDevice(req, res, next) {
  try {
    const deviceCode = req.headers['x-device-id'] || req.body.deviceId || req.body.deviceCode;
    const deviceToken = req.headers['x-device-token'] || req.body.deviceToken || req.body.token;
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const clientIp = String(rawIp).replace(/^::ffff:/i, '');
    const cardUid = req.body?.cardUid ? String(req.body.cardUid).replace(/[\s:-]+/g, '').trim().toUpperCase() : null;

    if (!deviceCode || !deviceToken) {
      return res.status(401).json({
        success: false,
        errorCode: 'ERR_DEVICE_AUTH_MISSING',
        message: 'Device credentials required. Provide X-Device-Id and X-Device-Token headers.'
      });
    }

    const device = await db.queryOne(`
      SELECT d.*, dc.api_token_raw, dc.secret_key,
             dep.code as department_code, dep.name as department_name,
             ay.name as academic_year_name,
             dv.name as division_name
      FROM esp32_devices d
      JOIN device_credentials dc ON d.id = dc.device_id
      JOIN departments dep ON d.department_id = dep.id
      JOIN academic_years ay ON d.academic_year_id = ay.id
      JOIN divisions dv ON d.division_id = dv.id
      WHERE UPPER(d.device_code) = UPPER(?) AND d.is_active = 1
    `, [String(deviceCode).trim()]);

    if (!device) {
      const reason = `Hardware device ${deviceCode} is not registered or deactivated. Register it in Super Admin -> Hardware Settings.`;
      recordUnregisteredDeviceAttempt({
        deviceCode,
        ip: clientIp,
        endpoint: req.originalUrl,
        cardUid,
        reason
      });
      if (cardUid) {
        recordUnknownCardScan({ cardUid, errorCode: 'ERR_DEVICE_UNAUTHORIZED' });
        emitScanFailure({ deviceCode, cardUid, reason, timestamp: new Date() });
      }
      return res.status(401).json({
        success: false,
        errorCode: 'ERR_DEVICE_UNAUTHORIZED',
        message: 'Device unauthorized or not registered yet.'
      });
    }

    // Token check (either exact raw token or secret key)
    if (device.api_token_raw !== deviceToken && device.secret_key !== deviceToken) {
      const reason = `Hardware device ${deviceCode} sent a mismatched API token.`;
      recordUnregisteredDeviceAttempt({
        deviceCode,
        ip: clientIp,
        endpoint: req.originalUrl,
        cardUid,
        reason
      });
      if (cardUid) {
        emitScanFailure({ deviceCode, cardUid, reason, timestamp: new Date() });
      }
      return res.status(403).json({
        success: false,
        errorCode: 'ERR_DEVICE_INVALID_TOKEN',
        message: 'Invalid hardware API token.'
      });
    }

    req.device = device;
    next();
  } catch (err) {
    console.error('[DEVICE AUTH ERROR]', err);
    res.status(500).json({ success: false, message: 'Device authentication failed due to server error.' });
  }
}

module.exports = {
  authenticateDevice
};
