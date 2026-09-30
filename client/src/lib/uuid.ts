const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const dashed = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

export function uuidV4(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return dashed(hex(b));
}

let lastTs = 0;

/** RFC 9562 UUIDv7: 48-bit millisecond timestamp + random bits. Monotonic within one page session. */
export function uuidV7(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  let ts = Date.now();
  if (ts <= lastTs) ts = lastTs + 1;
  lastTs = ts;
  b[0] = Math.floor(ts / 2 ** 40) & 255;
  b[1] = Math.floor(ts / 2 ** 32) & 255;
  b[2] = (ts >>> 24) & 255;
  b[3] = (ts >>> 16) & 255;
  b[4] = (ts >>> 8) & 255;
  b[5] = ts & 255;
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  return dashed(hex(b));
}

export function inspectUuid(input: string): { valid: boolean; version?: number; variant?: string; timestamp?: Date } {
  const s = input.trim().replace(/^\{|\}$/g, '');
  const m = /^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$/i.exec(s);
  if (!m) return { valid: false };
  const version = parseInt(m[3][0], 16);
  const v = parseInt(m[4][0], 16);
  const variant = v < 8 ? 'NCS (reserved)' : v < 12 ? 'RFC 9562 / RFC 4122' : v < 14 ? 'Microsoft (reserved)' : 'Reserved for future use';
  const out: { valid: boolean; version: number; variant: string; timestamp?: Date } = { valid: true, version, variant };
  if (version === 7) out.timestamp = new Date(parseInt(m[1] + m[2], 16));
  return out;
}
