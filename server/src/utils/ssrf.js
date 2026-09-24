import dns from 'node:dns';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

export class ProxyError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'ProxyError';
    this.code = code;
    this.status = status;
  }
}

/**
 * True only for globally routable unicast addresses.
 * Rejects loopback, private (RFC1918), link-local (incl. cloud metadata 169.254.169.254),
 * CGNAT, unique-local, multicast, reserved, unspecified and transition ranges.
 */
export function isPublicIp(address) {
  try {
    let addr = ipaddr.parse(address);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) addr = addr.toIPv4Address();
    return addr.range() === 'unicast';
  } catch {
    return false;
  }
}

const blocked = (host) =>
  new ProxyError(
    'BLOCKED_TARGET',
    `Requests to private or internal addresses are blocked (${host}). Use "Browser" mode to call APIs on your own machine.`,
    403,
  );

/** Validates a user supplied URL before any network activity. */
export function assertSafeUrl(input, { allowPrivate = false } = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new ProxyError('INVALID_URL', 'That does not look like a valid URL. Include http:// or https://.', 400);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ProxyError('INVALID_PROTOCOL', 'Only http:// and https:// URLs are supported.', 400);
  }
  if (url.username || url.password) {
    throw new ProxyError('URL_CREDENTIALS', 'Remove the username and password from the URL and use the Auth tab instead.', 400);
  }
  if (allowPrivate) return url;

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw blocked(host);
  }
  if (net.isIP(host) && !isPublicIp(host)) throw blocked(host);
  return url;
}

/**
 * DNS lookup that refuses non-public addresses. Used as the socket-level `lookup`
 * so the address that is validated is the address that is connected to
 * (protects against DNS rebinding).
 */
export function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => !isPublicIp(a.address))) {
      return callback(blocked(hostname));
    }
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}
