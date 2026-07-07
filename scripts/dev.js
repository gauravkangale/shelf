import { spawn } from 'child_process';
import { createConnection } from 'net';

console.log('🚀 Starting backend server...');
const server = spawn('npm', ['run', 'server'], { stdio: 'inherit', shell: true });

function checkServer() {
  const client = createConnection(3001, '127.0.0.1', () => {
    client.destroy();
    console.log('✨ Backend is ready! Starting frontend dev server...');
    spawn('npm', ['run', 'dev:frontend'], { stdio: 'inherit', shell: true });
  });
  client.on('error', () => {
    setTimeout(checkServer, 200);
  });
}

// Clean up child processes on termination
const cleanup = () => {
   
  // eslint-disable-next-line no-unused-vars
  try { server.kill(); } catch (e) { /* ignore */ }
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

checkServer();
