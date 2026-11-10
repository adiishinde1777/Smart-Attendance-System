const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

function checkConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function isPortInUse(port) {
  return (await checkConnect(port, '127.0.0.1')) || (await checkConnect(port, '::1'));
}

function startProcess(name, cwd, commandLine) {
  const proc = spawn(commandLine, {
    cwd,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  proc.stderr.on('data', (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  proc.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return proc;
}

async function main() {
  console.log('=======================================================');
  console.log(' Starting Smart Attendance System (Backend + Frontend) ');
  console.log('=======================================================');

  const children = [];
  const backendInUse = await isPortInUse(5000);
  const frontendInUse = await isPortInUse(3000);

  if (backendInUse) {
    console.log('[BACKEND] Port 5000 is already running. Reusing active backend.');
  } else {
    children.push(startProcess('BACKEND', path.join(__dirname, 'backend'), 'npm start'));
  }

  if (frontendInUse) {
    console.log('[FRONTEND] Port 3000 is already running. Open http://localhost:3000');
  } else {
    children.push(startProcess('FRONTEND', path.join(__dirname, 'frontend'), 'npm run dev'));
  }

  console.log('');
  console.log(' -> Open Website: http://localhost:3000');
  console.log(' -> Backend API : http://localhost:5000/api/health');
  console.log('');

  const shutdown = () => {
    for (const child of children) {
      try { child.kill(); } catch (_) {}
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
