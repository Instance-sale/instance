const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

if (apiUrl) {
  const manifestPath = path.resolve(__dirname, '.next/routes-manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.rewrites && Array.isArray(manifest.rewrites.afterFiles)) {
        for (const rule of manifest.rewrites.afterFiles) {
          if (rule.destination && rule.destination.includes('/api/:path')) {
            rule.destination = `${apiUrl}/api/:path`;
          }
        }
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`[entrypoint] Configured Next.js rewrite proxy target to: ${apiUrl}`);
      }
    } catch (err) {
      console.warn('[entrypoint] Notice: Failed to update routes-manifest:', err);
    }
  }
}

// Start Next.js production server
const next = spawn(
  'node',
  ['node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', process.env.PORT || '3000'],
  { stdio: 'inherit' },
);

next.on('exit', (code) => {
  process.exit(code || 0);
});
