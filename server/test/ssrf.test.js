import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIp, assertSafeUrl, ProxyError } from '../src/utils/ssrf.js';

test('isPublicIp allows public addresses', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
    assert.equal(isPublicIp(ip), true, ip);
  }
});

test('isPublicIp blocks private, loopback, link-local and metadata ranges', () => {
  const blockedIps = [
    '127.0.0.1', '127.1.2.3', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'ff02::1',
  ];
  for (const ip of blockedIps) assert.equal(isPublicIp(ip), false, ip);
});

test('isPublicIp rejects garbage', () => {
  assert.equal(isPublicIp('not-an-ip'), false);
  assert.equal(isPublicIp(''), false);
});

test('assertSafeUrl accepts normal urls', () => {
  assert.equal(assertSafeUrl('https://api.github.com/users/octocat').hostname, 'api.github.com');
  assert.equal(assertSafeUrl('http://8.8.8.8/').hostname, '8.8.8.8');
});

test('assertSafeUrl blocks dangerous urls', () => {
  const bad = [
    'ftp://example.com', 'file:///etc/passwd', 'gopher://x', 'javascript:alert(1)',
    'http://localhost/', 'http://foo.localhost/', 'http://printer.local/', 'http://metadata.internal/',
    'http://127.0.0.1:8080/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/',
    'http://2130706433/', // decimal form of 127.0.0.1
    'http://0x7f000001/', // hex form
    'http://017700000001/', // octal form
    'http://127.1/', 'http://0/', 'http://[::ffff:7f00:1]/',
    'http://user:pass@example.com/', 'nonsense',
  ];
  for (const u of bad) {
    assert.throws(() => assertSafeUrl(u), (err) => err instanceof ProxyError, u);
  }
});

test('assertSafeUrl allowPrivate bypasses the private range check only', () => {
  assert.equal(assertSafeUrl('http://127.0.0.1:3000/x', { allowPrivate: true }).port, '3000');
  assert.throws(() => assertSafeUrl('ftp://127.0.0.1', { allowPrivate: true }));
});
