import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { assertSafeUrl, safeLookup, ProxyError } from './ssrf.js';

const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

// Headers the caller may not control.
const FORBIDDEN_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'expect',
  'proxy-authorization',
  'proxy-connection',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
]);

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const TEXT_TYPE = /(text|json|xml|javascript|html|csv|yaml|x-www-form-urlencoded|svg|graphql|markdown)/i;

function cleanHeaders(input = {}) {
  const out = {};
  for (const [rawName, rawValue] of Object.entries(input)) {
    const name = String(rawName).trim().toLowerCase();
    if (!name) continue;
    if (!HEADER_NAME.test(name)) throw new ProxyError('INVALID_HEADER', `Invalid header name: ${rawName}`, 400);
    if (FORBIDDEN_HEADERS.has(name)) continue;
    const value = String(rawValue);
    if (/[\r\n\0]/.test(value)) throw new ProxyError('INVALID_HEADER', `Invalid value for header: ${rawName}`, 400);
    out[name] = value;
  }
  return out;
}

function mapNetworkError(err) {
  if (err instanceof ProxyError) return err;
  const code = err && err.code;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return new ProxyError('DNS_FAILED', 'Could not resolve that host name. Check the URL for typos.', 502);
  }
  if (code === 'ECONNREFUSED') {
    return new ProxyError('CONNECTION_REFUSED', 'The server refused the connection.', 502);
  }
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return new ProxyError('CONNECTION_RESET', 'The connection was closed by the server.', 502);
  }
  if (code === 'ETIMEDOUT') {
    return new ProxyError('TIMEOUT', 'The connection timed out.', 504);
  }
  if (
    typeof code === 'string' &&
    (code.startsWith('ERR_TLS') ||
      code.includes('CERT') ||
      code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      code === 'DEPTH_ZERO_SELF_SIGNED_CERT')
  ) {
    return new ProxyError('TLS_ERROR', 'The server has an invalid or untrusted TLS certificate.', 502);
  }
  return new ProxyError('REQUEST_FAILED', 'The request could not be completed.', 502);
}

function decodeBody(buffer, contentType) {
  const match = /charset=([^;\s]+)/i.exec(contentType || '');
  let label = match ? match[1].replace(/["']/g, '').toLowerCase() : 'utf-8';
  try {
    return new TextDecoder(label).decode(buffer);
  } catch {
    label = 'utf-8';
    return new TextDecoder(label).decode(buffer);
  }
}

function requestOnce(url, { method, headers, body, remainingMs, maxBytes, allowPrivate }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    let req;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const lib = url.protocol === 'https:' ? https : http;
    const payload = body !== undefined && body !== '' && method !== 'GET' && method !== 'HEAD' ? Buffer.from(body, 'utf8') : null;
    const reqHeaders = { ...headers };
    if (payload) reqHeaders['content-length'] = String(payload.length);

    try {
      req = lib.request(url, {
        method,
        headers: reqHeaders,
        lookup: allowPrivate ? undefined : safeLookup,
        agent: false,
      });
    } catch (err) {
      return finish(reject, new ProxyError('INVALID_HEADER', 'One of the request headers is invalid.', 400));
    }

    timer = setTimeout(() => {
      const err = new ProxyError('TIMEOUT', 'The request took too long and was cancelled.', 504);
      finish(reject, err);
      req.destroy();
    }, remainingMs);

    req.on('error', (err) => finish(reject, mapNetworkError(err)));

    req.on('response', (res) => {
      const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (method !== 'HEAD' && res.statusCode !== 204 && res.statusCode !== 304) {
        if (encoding === 'gzip' || encoding === 'x-gzip') stream = res.pipe(zlib.createGunzip());
        else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      }

      const chunks = [];
      let size = 0;
      let truncated = false;

      const done = () =>
        finish(resolve, {
          status: res.statusCode,
          statusText: res.statusMessage || '',
          headers: res.headers,
          buffer: Buffer.concat(chunks),
          size,
          truncated,
        });

      stream.on('data', (chunk) => {
        if (truncated || settled) return;
        const room = maxBytes - size;
        if (chunk.length > room) {
          if (room > 0) chunks.push(chunk.subarray(0, room));
          size += Math.max(room, 0);
          truncated = true;
          res.destroy();
          stream.destroy();
          done();
        } else {
          chunks.push(chunk);
          size += chunk.length;
        }
      });
      stream.on('end', done);
      stream.on('error', (err) => {
        if (truncated) return done();
        finish(reject, new ProxyError('BAD_RESPONSE', 'The response could not be read (bad encoding or connection error).', 502));
      });
      res.on('error', (err) => {
        if (truncated) return done();
        finish(reject, mapNetworkError(err));
      });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Performs an outbound HTTP request on behalf of the browser, safely.
 * - only public http(s) targets (validated on every redirect hop and at socket level)
 * - hard time limit, hard response size limit
 * - never forwards credentials across origins when following redirects
 */
export async function proxyRequest(input, options = {}) {
  const {
    timeoutMs = 15_000,
    maxBytes = 2 * 1024 * 1024,
    maxRedirects = 5,
    allowPrivate = false,
  } = options;

  let url = assertSafeUrl(input.url, { allowPrivate });
  let method = input.method || 'GET';
  let body = input.body;
  let headers = {
    'user-agent': 'ToolviuAPITester/1.0',
    accept: '*/*',
    'accept-encoding': 'gzip, deflate, br',
    ...cleanHeaders(input.headers),
  };

  const redirects = [];
  const started = process.hrtime.bigint();
  const deadline = Date.now() + timeoutMs;

  for (let hop = 0; ; hop += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new ProxyError('TIMEOUT', 'The request took too long and was cancelled.', 504);

    const res = await requestOnce(url, { method, headers, body, remainingMs, maxBytes, allowPrivate });

    const location = res.headers.location;
    if (input.followRedirects && REDIRECT_CODES.has(res.status) && location) {
      if (hop >= maxRedirects) {
        throw new ProxyError('TOO_MANY_REDIRECTS', `Stopped after ${maxRedirects} redirects.`, 502);
      }
      let next;
      try {
        next = assertSafeUrl(new URL(location, url).href, { allowPrivate });
      } catch (err) {
        if (err instanceof ProxyError) throw err;
        throw new ProxyError('INVALID_REDIRECT', 'The server sent an invalid redirect location.', 502);
      }
      redirects.push({ status: res.status, from: url.href, to: next.href });

      headers = { ...headers };
      if (next.origin !== url.origin) {
        delete headers.authorization;
        delete headers.cookie;
      }
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) {
        if (method !== 'HEAD') method = 'GET';
        body = undefined;
        delete headers['content-type'];
      }
      url = next;
      continue;
    }

    const contentType = String(res.headers['content-type'] || '');
    const isText = res.buffer.length === 0 || contentType === '' || TEXT_TYPE.test(contentType);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    return {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      timeMs: Math.round(elapsedMs),
      sizeBytes: res.size,
      truncated: res.truncated,
      isBinary: !isText,
      contentType,
      body: isText ? decodeBody(res.buffer, contentType) : null,
      finalUrl: url.href,
      redirects,
    };
  }
}
