import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../server.mjs', import.meta.url));
let child = null;
let base = '';

// Start the server on a port in 20000-29999, starting from a pid-derived
// offset and moving on if the port is taken (parallel test runs).
function tryStart(port) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [script, String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok ? c : null); } };
    c.stdout.on('data', (d) => { if (String(d).includes('http://')) finish(true); });
    c.on('exit', () => finish(false));
    c.on('error', () => finish(false));
  });
}

beforeAll(async () => {
  const start = process.pid % 10000;
  for (let i = 0; i < 50 && !child; i++) {
    const port = 20000 + ((start + i) % 10000);
    child = await tryStart(port);
    if (child) base = `http://127.0.0.1:${port}`;
  }
  if (!child) throw new Error('could not start server.mjs');
}, 30000);

afterAll(() => { if (child) child.kill('SIGKILL'); });

describe('dev server', () => {
  it('GET /% is a 400 and the server is still up', async () => {
    expect((await fetch(`${base}/%`)).status).toBe(400);
    expect((await fetch(`${base}/`)).status).toBe(200);
  });
  it('serves the manifest with its own type', async () => {
    expect((await fetch(`${base}/manifest.webmanifest`)).headers.get('content-type')).toBe('application/manifest+json');
  });
  it('still refuses path traversal', async () => {
    expect([403, 404]).toContain((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status);
  });
});
