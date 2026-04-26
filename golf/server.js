'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;
const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
const DIR = __dirname;

// Browser uses relative URLs so all /api/* calls route through this server's proxy.
// API_URL is used server-side only (for the proxy target).
const GAME_INJECT = `<script>window.GOLF_API_URL='';window.GOLF_BASE_PATH='';</script>\n<script src="/golf-api.js"></script>\n</body>`;
const LOGIN_INJECT = `<script>window.GOLF_API_URL='';window.GOLF_BASE_PATH='';</script>`;

const server = http.createServer((req, res) => {
  const rawUrl = req.url || '/';
  const urlPath = rawUrl.split('?')[0];

  // Proxy all /api/* requests to the PA API
  if (urlPath.startsWith('/api/')) {
    return proxyRequest(req, res, API_URL + rawUrl);
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    let html;
    try {
      html = fs.readFileSync(path.join(DIR, 'login.html'), 'utf8');
    } catch {
      return send404(res, 'login.html not found');
    }
    // Inject GOLF_API_URL config before </head>
    html = html.replace('</head>', LOGIN_INJECT + '\n</head>');
    return sendHtml(res, html);
  }

  if (urlPath === '/game' || urlPath === '/game.html') {
    let html;
    try {
      html = fs.readFileSync(path.join(DIR, 'golf.html'), 'utf8');
    } catch {
      return send404(res, 'golf.html not found');
    }
    // Inject GOLF_API_URL config + golf-api.js before </body>
    html = html.replace('</body>', GAME_INJECT);
    return sendHtml(res, html);
  }

  if (urlPath === '/golf-api.js') {
    try {
      const content = fs.readFileSync(path.join(DIR, 'golf-api.js'));
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(content);
    } catch {
      return send404(res, 'golf-api.js not found');
    }
  }

  send404(res, 'Not found');
});

function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function send404(res, msg) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(msg);
}

function proxyRequest(req, res, targetUrl) {
  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    res.writeHead(502);
    return res.end('Bad proxy target');
  }

  const isHttps = target.protocol === 'https:';
  const lib = isHttps ? https : http;

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);

    // Forward headers but replace host
    const headers = Object.assign({}, req.headers, { host: target.hostname });
    if (body.length > 0) headers['content-length'] = String(body.length);

    const options = {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers,
    };

    const proxyReq = lib.request(options, (proxyRes) => {
      // Forward response headers, stripping problematic ones
      const responseHeaders = Object.assign({}, proxyRes.headers);
      delete responseHeaders['transfer-encoding'];
      res.writeHead(proxyRes.statusCode || 500, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
}

server.listen(PORT, () => {
  console.log(`Golf server running on port ${PORT}, proxying API to ${API_URL}`);
});
