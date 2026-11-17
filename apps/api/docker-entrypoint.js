const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('[api-entrypoint] Initializing API container...');

// 1. Run database migrations before launching NestJS
try {
  const prismaDir = path.resolve(__dirname, '../../packages/prisma');
  console.log(`[api-entrypoint] Applying database migrations from: ${prismaDir}`);
  execSync('pnpm run db:deploy', {
    cwd: prismaDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[api-entrypoint] Database migrations applied successfully.');
} catch (error) {
  console.error('[api-entrypoint] Database migration error:', error.message || error);
}

// 2. Start NestJS API server
console.log(`[api-entrypoint] Starting NestJS API server on port ${process.env.PORT || 4000}...`);

const args = process.argv.slice(2);
let child;

if (args.length > 0) {
  const [cmd, ...cmdArgs] = args;
  child = spawn(cmd, cmdArgs, { cwd: __dirname, stdio: 'inherit', env: process.env });
} else {
  child = spawn('node', ['dist/main.js'], { cwd: __dirname, stdio: 'inherit', env: process.env });
}

child.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`[api-entrypoint] API server exited with code ${code}`);
  }
  process.exit(code || 0);
});
