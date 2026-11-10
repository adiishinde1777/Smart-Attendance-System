const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client can join their specific student room or teacher dashboard room
    socket.on('join_student', (studentId) => {
      socket.join(`student:${studentId}`);
    });

    socket.on('join_teacher', () => {
      socket.join('teachers');
    });

    socket.on('join_device_monitor', () => {
      socket.join('devices');
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitAttendanceMarked(payload) {
  if (!io) return;
  // Send to all teachers/dashboard listeners
  io.to('teachers').emit('attendance_update', payload);
  // Send globally to anyone on attendance screen
  io.emit('attendance_marked', payload);
  // Send to individual student room
  if (payload.studentId) {
    io.to(`student:${payload.studentId}`).emit('my_attendance_update', payload);
  }
}

function emitScanFailure(payload) {
  if (!io) return;
  io.to('teachers').emit('scan_failed', payload);
  io.emit('device_scan_failed', payload);
}

function emitDeviceHeartbeat(payload) {
  if (!io) return;
  io.to('teachers').emit('device_heartbeat', payload);
  io.to('devices').emit('device_heartbeat', payload);
}

function emitNotification(userId, notification) {
  if (!io) return;
  io.emit(`notification:${userId}`, notification);
}

module.exports = {
  initSocket,
  getIO,
  emitAttendanceMarked,
  emitScanFailure,
  emitDeviceHeartbeat,
  emitNotification
};
