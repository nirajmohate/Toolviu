import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/app.js');

let server;
let base;

before(async () => {
  const app = createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('GET /api/health works without a database', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'ok');
  assert.equal(json.db, 'down');
});

test('unknown routes return JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});

test('malformed JSON returns 400', async () => {
  const res = await post('/api/proxy', '{bad json');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_JSON');
});

test('proxy validates input', async () => {
  const res = await post('/api/proxy', { url: '', method: 'NOPE' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
});

test('proxy blocks internal targets with 403', async () => {
  const res = await post('/api/proxy', { url: 'http://169.254.169.254/latest/meta-data/', method: 'GET' });
  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.equal(json.error.code, 'BLOCKED_TARGET');
});

test('proxy rejects non-http protocols', async () => {
  const res = await post('/api/proxy', { url: 'file:///etc/passwd' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_PROTOCOL');
});

test('database routes return 503 when the database is down', async () => {
  for (const [path, body] of [
    ['/api/share', { tool: 'json-formatter', data: '{"a":1}' }],
    ['/api/stats/view', { tool: 'json-formatter' }],
  ]) {
    const res = await post(path, body);
    assert.equal(res.status, 503, path);
  }
  const res = await fetch(`${base}/api/share/abcdefghj`);
  assert.equal(res.status, 503);
});

test('share validates tool names before touching the database', async () => {
  const res = await post('/api/share', { tool: 'jwt-decoder', data: 'x' });
  assert.equal(res.status, 400);
});

test('feedback honeypot returns success and validation works', async () => {
  const bad = await post('/api/feedback', { message: 'hi' });
  assert.equal(bad.status, 400);
  const bot = await post('/api/feedback', { message: 'buy cheap stuff now', website: 'http://spam' });
  assert.equal(bot.status, 201);
});

test('security headers are present and x-powered-by is hidden', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('CORS rejects unknown origins', async () => {
  const res = await fetch(`${base}/api/health`, { headers: { origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
  const ok = await fetch(`${base}/api/health`, { headers: { origin: 'http://localhost:3000' } });
  assert.equal(ok.status, 200);
});
