export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type B64Decode = { ok: true; bytes: Uint8Array } | { ok: false; message: string };

/** Accepts standard and URL-safe alphabets, with or without padding, ignoring whitespace. */
export function base64ToBytes(input: string): B64Decode {
  const cleaned = input.replace(/\s+/g, '');
  if (!cleaned) return { ok: true, bytes: new Uint8Array() };
  const stripped = cleaned.replace(/=+$/, '');
  const bad = /[^A-Za-z0-9+/_-]/.exec(stripped);
  if (bad) return { ok: false, message: `Invalid character "${bad[0]}" at position ${bad.index + 1}. Base64 uses letters, digits, + and / (or - and _).` };
  if (stripped.length % 4 === 1) return { ok: false, message: 'The length is not valid for Base64. Some characters may be missing.' };
  const std = stripped.replace(/-/g, '+').replace(/_/g, '/');
  const padded = std + '='.repeat((4 - (std.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return { ok: true, bytes };
  } catch {
    return { ok: false, message: 'This is not valid Base64.' };
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
