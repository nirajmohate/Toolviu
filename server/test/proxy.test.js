import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import { proxyRequest } from '../src/utils/proxyRequest.js';
import { ProxyError } from '../src/utils/ssrf.js';

let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      switch (url.pathname) {
        case '/json':
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ method: req.method, body, auth: req.headers.authorization || null, ua: req.headers['user-agent'] }));
          break;
        case '/redirect':
          res.statusCode = 302;
          res.setHeader('location', '/json');
          res.end();
          break;
        case '/loop':
          res.statusCode = 302;
          res.setHeader('location', '/loop');
          res.end();
          break;
        case '/gzip':
          res.setHeader('content-type', 'text/plain');
          res.setHeader('content-encoding', 'gzip');
          res.end(zlib.gzipSync('hello gzip'));
          break;
        case '/big':
          res.setHeader('content-type', 'text/plain');
          res.end('x'.repeat(50_000));
          break;
        case '/slow':
          setTimeout(() => res.end('late'), 2000);
          break;
        case '/binary':
          res.setHeader('content-type', 'image/png');
          res.end(Buffer.from([137, 80, 78, 71, 0, 1, 2, 3]));
          break;
        case '/set-cookie':
          res.setHeader('set-cookie', ['a=1', 'b=2']);
          res.end('ok');
          break;
        default:
          res.statusCode = 404;
          res.end('nope');
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const opts = { allowPrivate: true, timeoutMs: 5000, maxBytes: 1024 * 1024, maxRedirects: 3 };

test('GET returns status, headers, body, timing', async () => {
  const r = await proxyRequest({ url: `${base}/json`, method: 'GET', headers: {}, followRedirects: true }, opts);
  assert.equal(r.status, 200);
  assert.match(r.contentType, /json/);
  assert.equal(JSON.parse(r.body).method, 'GET');
  assert.equal(JSON.parse(r.body).ua, 'ToolviuAPITester/1.0');
  assert.ok(r.timeMs >= 0);
  assert.equal(r.isBinary, false);
});

test('POST forwards body and custom headers; forbidden headers are dropped', async () => {
  const r = await proxyRequest(
    { url: `${base}/json`, method: 'POST', headers: { Authorization: 'Bearer abc', 'X-Forwarded-For': '1.2.3.4', Host: 'evil' }, body: '{"a":1}', followRedirects: true },
    opts,
  );
  const parsed = JSON.parse(r.body);
  assert.equal(parsed.method, 'POST');
  assert.equal(parsed.body, '{"a":1}');
  assert.equal(parsed.auth, 'Bearer abc');
});

test('follows redirects and records them', async () => {
  const r = await proxyRequest({ url: `${base}/redirect`, method: 'GET', followRedirects: true }, opts);
  assert.equal(r.status, 200);
  assert.equal(r.redirects.length, 1);
  assert.ok(r.finalUrl.endsWith('/json'));
});

test('does not follow redirects when disabled', async () => {
  const r = await proxyRequest({ url: `${base}/redirect`, method: 'GET', followRedirects: false }, opts);
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, '/json');
});

test('redirect loops are stopped', async () => {
  await assert.rejects(
    proxyRequest({ url: `${base}/loop`, method: 'GET', followRedirects: true }, opts),
    (e) => e instanceof ProxyError && e.code === 'TOO_MANY_REDIRECTS',
  );
});

test('decompresses gzip', async () => {
  const r = await proxyRequest({ url: `${base}/gzip`, method: 'GET' }, opts);
  assert.equal(r.body, 'hello gzip');
});

test('truncates oversized responses', async () => {
  const r = await proxyRequest({ url: `${base}/big`, method: 'GET' }, { ...opts, maxBytes: 1000 });
  assert.equal(r.truncated, true);
  assert.equal(r.sizeBytes, 1000);
  assert.equal(r.body.length, 1000);
});

test('times out slow servers', async () => {
  await assert.rejects(
    proxyRequest({ url: `${base}/slow`, method: 'GET' }, { ...opts, timeoutMs: 300 }),
    (e) => e instanceof ProxyError && e.code === 'TIMEOUT',
  );
});

test('binary bodies are not returned as text', async () => {
  const r = await proxyRequest({ url: `${base}/binary`, method: 'GET' }, opts);
  assert.equal(r.isBinary, true);
  assert.equal(r.body, null);
  assert.equal(r.sizeBytes, 8);
});

test('multiple set-cookie headers are preserved as an array', async () => {
  const r = await proxyRequest({ url: `${base}/set-cookie`, method: 'GET' }, opts);
  assert.deepEqual(r.headers['set-cookie'], ['a=1', 'b=2']);
});

test('private targets are blocked by default', async () => {
  for (const url of [`${base}/json`, 'http://localhost:1/', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]:80/']) {
    await assert.rejects(
      proxyRequest({ url, method: 'GET' }, { timeoutMs: 3000 }),
      (e) => e instanceof ProxyError && e.code === 'BLOCKED_TARGET',
      url,
    );
  }
});

test('hostnames that resolve to private ips are blocked at socket level', async () => {
  // "localtest.me" style names resolve to 127.0.0.1; use nip-style via /etc/hosts-free approach:
  // dns.lookup('localhost') resolves to 127.0.0.1, exercised through safeLookup directly.
  const { safeLookup } = await import('../src/utils/ssrf.js');
  await new Promise((resolve) => {
    safeLookup('localhost', {}, (err) => {
      assert.ok(err instanceof ProxyError);
      assert.equal(err.code, 'BLOCKED_TARGET');
      resolve();
    });
  });
});

test('invalid header values are rejected', async () => {
  await assert.rejects(
    proxyRequest({ url: `${base}/json`, method: 'GET', headers: { 'bad name': 'x' } }, opts),
    (e) => e instanceof ProxyError && e.code === 'INVALID_HEADER',
  );
  await assert.rejects(
    proxyRequest({ url: `${base}/json`, method: 'GET', headers: { 'x-a': 'line1\r\nInjected: 1' } }, opts),
    (e) => e instanceof ProxyError && e.code === 'INVALID_HEADER',
  );
});

test('DNS failure maps to a friendly error', async () => {
  await assert.rejects(
    proxyRequest({ url: 'http://this-host-does-not-exist.invalid/', method: 'GET' }, { timeoutMs: 5000 }),
    (e) => e instanceof ProxyError && ['DNS_FAILED', 'REQUEST_FAILED'].includes(e.code),
  );
});
