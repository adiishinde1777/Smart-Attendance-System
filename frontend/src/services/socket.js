import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:5000`;

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to IoT Attendance WebSocket server. ID:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected from WebSocket server.');
    });
  }
  return socket;
}

export function subscribeToAttendance(callback) {
  const s = getSocket();
  s.emit('join_teacher');
  s.on('attendance_update', callback);
  s.on('attendance_marked', callback);

  return () => {
    s.off('attendance_update', callback);
    s.off('attendance_marked', callback);
  };
}

export function subscribeToScanFailure(callback) {
  const s = getSocket();
  s.on('scan_failed', callback);
  s.on('device_scan_failed', callback);

  return () => {
    s.off('scan_failed', callback);
    s.off('device_scan_failed', callback);
  };
}

export function subscribeToDeviceHeartbeat(callback) {
  const s = getSocket();
  s.emit('join_device_monitor');
  s.on('device_heartbeat', callback);

  return () => {
    s.off('device_heartbeat', callback);
  };
}

export function subscribeToStudentAttendance(studentId, callback) {
  const s = getSocket();
  s.emit('join_student', studentId);
  s.on('my_attendance_update', callback);

  return () => {
    s.off('my_attendance_update', callback);
  };
}
