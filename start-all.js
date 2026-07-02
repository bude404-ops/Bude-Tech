#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// M-IOS v26 — AUTO-STARTER
// Starts backend + frontend with one command: npm run dev
// ═══════════════════════════════════════════════════════════════

import { spawn } from 'child_process';

console.log('╔═══════════════════════════════════════════════╗');
console.log('║     M-IOS v26 — AUTO-STARTER                ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Start backend
const backend = spawn('node', ['server.js'], { cwd: './backend', stdio: 'pipe' });
backend.stdout.on('data', d => process.stdout.write('[BACKEND] ' + d));
backend.stderr.on('data', d => process.stderr.write('[BACKEND] ' + d));

// Wait 3s then start frontend
setTimeout(() => {
  const frontend = spawn('npx', ['vite'], { cwd: './frontend', stdio: 'pipe' });
  frontend.stdout.on('data', d => process.stdout.write('[FRONTEND] ' + d));
  frontend.stderr.on('data', d => process.stderr.write('[FRONTEND] ' + d));
}, 3000);

console.log('🚀 Backend starting on port 3001...');
console.log('🚀 Frontend will start on port 3000...');
console.log('\n📱 Open http://localhost:3000 when ready\n');
console.log('Press Ctrl+C to stop both servers\n');

// Keep process alive
setInterval(() => {}, 1000);
