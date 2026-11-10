// Lightweight in-memory diagnostics for live setup troubleshooting (no persistence needed)
const MAX_ITEMS = 10;

const unregisteredDeviceAttempts = [];
let latestUnknownCard = null;

function recordUnregisteredDeviceAttempt({ deviceCode, ip, endpoint, cardUid = null, reason }) {
  const code = String(deviceCode || 'UNKNOWN').trim().toUpperCase();
  const entry = {
    deviceCode: code,
    ip: ip || 'unknown',
    endpoint: endpoint || '/api/devices',
    cardUid: cardUid || null,
    reason: reason || 'Device not registered',
    timestamp: new Date().toISOString()
  };

  // Deduplicate by deviceCode + endpoint, keeping most recent first
  const idx = unregisteredDeviceAttempts.findIndex(
    (item) => item.deviceCode === entry.deviceCode && item.reason === entry.reason
  );
  if (idx !== -1) unregisteredDeviceAttempts.splice(idx, 1);
  unregisteredDeviceAttempts.unshift(entry);
  if (unregisteredDeviceAttempts.length > MAX_ITEMS) {
    unregisteredDeviceAttempts.length = MAX_ITEMS;
  }
}

function clearUnregisteredDeviceAttempt(deviceCode) {
  const code = String(deviceCode || '').trim().toUpperCase();
  for (let i = unregisteredDeviceAttempts.length - 1; i >= 0; i--) {
    if (unregisteredDeviceAttempts[i].deviceCode === code) {
      unregisteredDeviceAttempts.splice(i, 1);
    }
  }
}

function getUnregisteredDeviceAttempts() {
  return [...unregisteredDeviceAttempts];
}

function recordUnknownCardScan({ cardUid, errorCode }) {
  if (!cardUid) return;
  latestUnknownCard = {
    cardUid: String(cardUid).trim().toUpperCase(),
    errorCode: errorCode || 'ERR_CARD_UNKNOWN',
    detectedAt: new Date().toISOString()
  };
}

function clearUnknownCardScan(cardUid) {
  if (!latestUnknownCard) return;
  if (!cardUid || latestUnknownCard.cardUid === String(cardUid).trim().toUpperCase()) {
    latestUnknownCard = null;
  }
}

function getLatestUnknownCardScan() {
  return latestUnknownCard;
}

module.exports = {
  recordUnregisteredDeviceAttempt,
  clearUnregisteredDeviceAttempt,
  getUnregisteredDeviceAttempts,
  recordUnknownCardScan,
  clearUnknownCardScan,
  getLatestUnknownCardScan
};

