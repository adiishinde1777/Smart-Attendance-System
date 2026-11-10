require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { initDatabase } = require('./src/config/database');
const { ensureSchema } = require('./src/config/schemaSetup');
const { runSeedIfNeeded } = require('./src/config/seedRunner');
const { initSocket } = require('./src/config/socket');
const apiRoutes = require('./src/routes');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-Device-Token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Smart Attendance IoT Platform',
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// API Routes
app.use('/api', apiRoutes);

// Serve built frontend (allows opening http://localhost:5000 directly as well as :3000)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('[SYSTEM] Initializing Smart Attendance IoT System...');
    await initDatabase();
    await ensureSchema();
    await runSeedIfNeeded();

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Smart Attendance IoT Backend Server running on port ${PORT}`);
      console.log(`📡 WebSocket server listening for live RFID events`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('[FATAL SERVER START ERROR]', error);
    process.exit(1);
  }
}

startServer();
