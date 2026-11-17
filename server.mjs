// Tiny zero-dep static server for local dev: node server.mjs [port]
// (ES modules in index.html won't load from file://, so serve over http.)
// Binds 127.0.0.1 by default; HOST=0.0.0.0 node server.mjs [port] serves the
// LAN too, e.g. to try the touch controls on a phone.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.argv[2] || 8000);
const host = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path;
  try {
    path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  } catch { // malformed %-escape
    res.writeHead(400, { 'content-type': 'text/plain' });
    return res.end('bad request');
  }
  if (path === '') path = 'index.html';
  const file = join(root, path);
  if (!file.startsWith(root)) { // no path traversal
    res.writeHead(403, { 'content-type': 'text/plain' });
    return res.end('forbidden');
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found: ' + path);
  }
}).listen(port, host, () => {
  console.log(`unicorn-queens: http://localhost:${port}/ (bound to ${host})`);
});
