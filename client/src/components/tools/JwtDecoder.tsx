'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, Eraser, FileKey, ShieldAlert, XCircle } from 'lucide-react';
import { Button, Field, Input, Notice, Panel, TextArea, Toggle } from '../ui';
import { CopyButton } from '../CopyButton';
import { printJson, tryParse } from '@/lib/json';
import { readClipboard } from '@/lib/format';
import { relativeTime } from '@/lib/time';

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeSegment(seg: string): { text: string; json: unknown | undefined } {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(b64urlToBytes(seg));
  const parsed = tryParse(text);
  return { text, json: parsed.ok ? JSON.parse(text) : undefined };
}

type Decoded =
  | { ok: false; message: string }
  | {
      ok: true;
      parts: string[];
      header: { text: string; json: Record<string, unknown> | undefined };
      payload: { text: string; json: Record<string, unknown> | undefined };
      pretty: { header: string; payload: string };
    };

function decode(raw: string): Decoded | null {
  const token = raw.trim().replace(/^bearer\s+/i, '').replace(/\s+/g, '');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length === 5) return { ok: false, message: 'This looks like an encrypted token (JWE, five parts). Only signed tokens (JWS) can be decoded here.' };
  if (parts.length !== 3 && parts.length !== 2) return { ok: false, message: `A JWT has three parts separated by dots, but this has ${parts.length}.` };
  if (!parts.every((p) => /^[A-Za-z0-9_-]*$/.test(p))) return { ok: false, message: 'The token contains characters that are not valid Base64URL. Check for stray quotes or line breaks.' };
  try {
    const header = decodeSegment(parts[0]);
    const payload = decodeSegment(parts[1]);
    const pretty = (t: { text: string }) => {
      const p = tryParse(t.text);
      return p.ok ? printJson(p.node, { indent: '  ' }) : t.text;
    };
    return {
      ok: true,
      parts,
      header: header as never,
      payload: payload as never,
      pretty: { header: pretty(header), payload: pretty(payload) },
    };
  } catch {
    return { ok: false, message: 'Could not decode the token. The header or payload is not valid Base64URL-encoded UTF-8.' };
  }
}

const HASHES: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

function useNow(intervalMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const TIME_CLAIMS: [string, string][] = [
  ['iat', 'Issued at'],
  ['nbf', 'Not valid before'],
  ['exp', 'Expires'],
];

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [secretIsB64, setSecretIsB64] = useState(false);
  const [sig, setSig] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle');
  const [sigMessage, setSigMessage] = useState('');
  const deferred = useDeferredValue(token);
  const now = useNow(1000);

  const decoded = useMemo(() => decode(deferred), [deferred]);
  const header = decoded?.ok ? decoded.header.json : undefined;
  const payload = decoded?.ok ? decoded.payload.json : undefined;
  const alg = typeof header?.alg === 'string' ? header.alg : '';

  useEffect(() => {
    setSig('idle');
    setSigMessage('');
    if (!decoded?.ok || !secret || !HASHES[alg] || decoded.parts.length !== 3) return;
    let cancelled = false;
    (async () => {
      try {
        const keyBytes = secretIsB64 ? b64urlToBytes(secret.trim()) : new TextEncoder().encode(secret);
        const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, { name: 'HMAC', hash: HASHES[alg] }, false, ['verify']);
        const data = new TextEncoder().encode(`${decoded.parts[0]}.${decoded.parts[1]}`);
        const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(decoded.parts[2]) as BufferSource, data);
        if (!cancelled) setSig(ok ? 'valid' : 'invalid');
      } catch {
        if (!cancelled) {
          setSig('error');
          setSigMessage(secretIsB64 ? 'The secret is not valid Base64URL.' : 'Verification failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decoded, secret, secretIsB64, alg]);

  async function paste() {
    const t = await readClipboard();
    if (t !== null) setToken(t);
  }

  const claims = TIME_CLAIMS.map(([key, label]) => {
    const v = payload?.[key];
    if (typeof v !== 'number') return null;
    return { key, label, ms: v * 1000 };
  }).filter((c): c is { key: string; label: string; ms: number } => c !== null);

  const exp = typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
  const nbf = typeof payload?.nbf === 'number' ? payload.nbf * 1000 : null;
  let status: { kind: 'success' | 'error' | 'info'; text: string } | null = null;
  if (now !== null && decoded?.ok) {
    if (exp !== null && exp < now) status = { kind: 'error', text: `Expired ${relativeTime(exp, now)}` };
    else if (nbf !== null && nbf > now) status = { kind: 'error', text: `Not valid yet. Becomes valid ${relativeTime(nbf, now)}` };
    else if (exp !== null) status = { kind: 'success', text: `Not expired. Expires ${relativeTime(exp, now)}` };
    else status = { kind: 'info', text: 'This token has no expiry (exp) claim.' };
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel
          title="Encoded token"
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={paste}>
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Paste
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setToken(SAMPLE)}>
                <FileKey className="h-3.5 w-3.5" aria-hidden /> Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setToken('')} disabled={!token}>
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
            </>
          }
        >
          <div className="p-3">
            <TextArea aria-label="JWT" rows={8} value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste a JWT here, for example eyJhbGciOi..." className="break-all !whitespace-pre-wrap" />
            {decoded?.ok ? (
              <p className="code mt-3 break-all rounded-md bg-sunken p-3" aria-label="Token parts">
                <span className="text-accent">{decoded.parts[0]}</span>
                <span className="text-muted">.</span>
                <span className="text-ok">{decoded.parts[1]}</span>
                {decoded.parts.length === 3 ? (
                  <>
                    <span className="text-muted">.</span>
                    <span className="text-danger">{decoded.parts[2]}</span>
                  </>
                ) : null}
              </p>
            ) : null}
            {decoded && !decoded.ok ? <Notice kind="error" className="mt-3">{decoded.message}</Notice> : null}
          </div>
        </Panel>

        {decoded?.ok ? (
          <Panel title="Verify signature (optional)">
            <div className="space-y-3 p-3">
              {alg === 'none' ? (
                <Notice kind="error">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="h-4 w-4" aria-hidden /> Unsigned token (alg: none)
                  </span>
                  <br />
                  Anyone can create a token like this. Servers must reject it.
                </Notice>
              ) : HASHES[alg] ? (
                <>
                  <Field label={`Secret for ${alg}`} htmlFor="jwt-secret">
                    <Input id="jwt-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="your-256-bit-secret" />
                  </Field>
                  <Toggle checked={secretIsB64} onChange={setSecretIsB64} label="Secret is Base64URL encoded" />
                  <div aria-live="polite">
                    {sig === 'valid' ? (
                      <p className="inline-flex items-center gap-1.5 font-medium text-ok">
                        <CheckCircle2 className="h-4 w-4" aria-hidden /> Signature verified
                      </p>
                    ) : sig === 'invalid' ? (
                      <p className="inline-flex items-center gap-1.5 font-medium text-danger">
                        <XCircle className="h-4 w-4" aria-hidden /> Signature does not match
                      </p>
                    ) : sig === 'error' ? (
                      <p className="text-sm text-danger">{sigMessage}</p>
                    ) : (
                      <p className="text-sm text-muted">Enter the secret to check the signature. It never leaves your browser.</p>
                    )}
                  </div>
                </>
              ) : (
                <Notice>{alg ? `${alg} tokens use a public/private key pair, which cannot be verified with a shared secret here. The contents are decoded above.` : 'The header has no alg field, so the signature cannot be checked.'}</Notice>
              )}
            </div>
          </Panel>
        ) : null}
      </div>

      <div className="space-y-4">
        {status ? <Notice kind={status.kind}>{status.text}</Notice> : null}
        <Panel title="Header" actions={<CopyButton text={decoded?.ok ? decoded.pretty.header : ''} disabled={!decoded?.ok} />}>
          <pre className="code scroll-thin min-h-[6rem] overflow-auto p-3" aria-label="Decoded header">{decoded?.ok ? decoded.pretty.header : <span className="text-muted">Decoded header appears here</span>}</pre>
        </Panel>
        <Panel title="Payload" actions={<CopyButton text={decoded?.ok ? decoded.pretty.payload : ''} disabled={!decoded?.ok} />}>
          <pre className="code scroll-thin min-h-[10rem] overflow-auto p-3" aria-label="Decoded payload">{decoded?.ok ? decoded.pretty.payload : <span className="text-muted">Decoded payload appears here</span>}</pre>
        </Panel>
        {claims.length ? (
          <Panel title="Time claims">
            <dl className="divide-y divide-line text-sm">
              {claims.map((c) => (
                <div key={c.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                  <dt className="text-muted">
                    {c.label} <span className="font-mono text-xs">({c.key})</span>
                  </dt>
                  <dd className="text-right">
                    <span className="font-mono">{new Date(c.ms).toISOString().replace('.000Z', 'Z')}</span>
                    {now !== null ? <span className="ml-2 text-muted">{relativeTime(c.ms, now)}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
