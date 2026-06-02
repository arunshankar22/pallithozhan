const { spawn } = require('child_process');

console.log('[Build Wrapper] Starting custom build wrapper to prevent Vercel hangs...');

// Spawn the Expo export command
const child = spawn('npx', ['expo', 'export', '--platform', 'web'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' }
});

let completed = false;

function forceExit() {
  if (completed) return;
  completed = true;
  console.log('\n[Build Wrapper] Detected build completion signal (Exported: dist). Forcing process exit to prevent CI hang...');
  setTimeout(() => {
    console.log('[Build Wrapper] Exiting successfully.');
    process.exit(0);
  }, 2000); // 2 seconds buffer to ensure disk flush
}

// Pipe stdout and check for completion indicator
child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(data);
  
  if (output.includes('Exported: dist') || output.includes('Exported:')) {
    forceExit();
  }
});

// Pipe stderr
child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle normal child exit
child.on('close', (code) => {
  console.log(`\n[Build Wrapper] Child process exited with code ${code}`);
  if (!completed) {
    completed = true;
    process.exit(code || 0);
  }
});

// Safeguard timeout (15 minutes)
setTimeout(() => {
  if (!completed) {
    console.error('\n[Build Wrapper] Build timed out after 15 minutes.');
    try {
      child.kill('SIGKILL');
    } catch (e) {}
    process.exit(1);
  }
}, 15 * 60 * 1000);
