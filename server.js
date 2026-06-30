const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { exec } = require('child_process');

const PORT = 3000;

function discordRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // ── Serve the app ──────────────────────────────────────────────
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const htmlPath = path.join(__dirname, 'PresaleDrop.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) { res.writeHead(500); res.end('Could not load PresaleDrop.html'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // ── Discord DM proxy ───────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/discord-dm') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const send = payload => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      try {
        const { token, userId, message } = JSON.parse(body);

        // Step 1: Open DM channel
        const dmBody = JSON.stringify({ recipient_id: userId });
        const dmRes  = await discordRequest({
          hostname: 'discord.com',
          path: '/api/v10/users/@me/channels',
          method: 'POST',
          headers: {
            'Authorization': `Bot ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dmBody)
          }
        }, dmBody);

        if (dmRes.status !== 200) {
          const err = JSON.parse(dmRes.body);
          return send({ ok: false, error: err.message || `HTTP ${dmRes.status}` });
        }
        const channel = JSON.parse(dmRes.body);

        // Step 2: Send message
        const msgBody = JSON.stringify({ content: message });
        const msgRes  = await discordRequest({
          hostname: 'discord.com',
          path: `/api/v10/channels/${channel.id}/messages`,
          method: 'POST',
          headers: {
            'Authorization': `Bot ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(msgBody)
          }
        }, msgBody);

        if (msgRes.status !== 200) {
          const err = JSON.parse(msgRes.body);
          return send({ ok: false, error: err.message || `HTTP ${msgRes.status}` });
        }

        send({ ok: true });
      } catch (e) {
        send({ ok: false, error: e.message });
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, 'localhost', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n✅  PresaleDrop is running!`);
  console.log(`    Opening ${url} in your browser…\n`);
  console.log(`    Keep this window open while using the app.`);
  console.log(`    Press Ctrl+C to stop.\n`);

  const p = process.platform;
  if (p === 'darwin')  exec(`open "${url}"`);
  else if (p === 'win32') exec(`start "" "${url}"`);
  else exec(`xdg-open "${url}"`);
});
