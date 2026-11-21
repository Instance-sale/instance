const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('[api-entrypoint] Initializing API container...');

// 1. Run formal database migrations first
const prismaDir = path.resolve('/app/packages/prisma');
let migrationSucceeded = false;

try {
  console.log(`[api-entrypoint] Attempting prisma migrate deploy from: ${prismaDir}`);
  execSync('pnpm exec prisma migrate deploy --schema=./schema.prisma', {
    cwd: prismaDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[api-entrypoint] Database migrations applied successfully.');
  migrationSucceeded = true;
} catch (migrateError) {
  console.warn('[api-entrypoint] Notice: migrate deploy skipped or encountered lock:', migrateError.message || migrateError);
}

// 2. Iron-clad safety sync: Run db push to guarantee all tables and columns exist
try {
  console.log('[api-entrypoint] Ensuring database schema is fully synchronized via db push...');
  execSync('pnpm exec prisma db push --skip-generate --schema=./schema.prisma', {
    cwd: prismaDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[api-entrypoint] Database schema synchronized successfully.');
} catch (pushError) {
  if (!migrationSucceeded) {
    console.error('[api-entrypoint] Warning: Schema synchronization encountered an issue:', pushError.message || pushError);
  }
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
