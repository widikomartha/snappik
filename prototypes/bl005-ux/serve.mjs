import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Explicit allowlist: never serve the repository, research, secrets or arbitrary paths.
const files = new Map([
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/app.html', ['app.html', 'text/html']], ['/app.mjs', ['app.mjs', 'text/javascript']],
  ['/model.mjs', ['model.mjs', 'text/javascript']], ['/strings.mjs', ['strings.mjs', 'text/javascript']],
  ['/tokens.css', ['tokens.css', 'text/css']], ['/styles.css', ['styles.css', 'text/css']],
  ['/workbench.mjs', ['workbench.mjs', 'text/javascript']],
]);
export function createServer() {
  return http.createServer(async (req, res) => {
    const file = files.get(new URL(req.url, 'http://localhost').pathname);
    if (req.method !== 'GET' || !file) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const bytes = await readFile(fileURLToPath(new URL(file[0], import.meta.url)));
      res.writeHead(200, {
        'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
      });
      res.end(bytes);
    } catch { res.writeHead(500); res.end('Local prototype file unavailable'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(4175, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4175'));
}
