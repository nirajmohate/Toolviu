'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Eraser, Upload } from 'lucide-react';
import { md5 } from 'js-md5';
import { Button, Field, Input, Notice, Panel, Segmented, Select, TextArea, Toggle } from '../ui';
import { CopyButton } from '../CopyButton';
import { bytesToBase64, bytesToHex } from '@/lib/base64';
import { formatBytes } from '@/lib/format';

type Source = 'text' | 'file';
type Encoding = 'hex' | 'base64';

const ALGOS = [
  { id: 'MD5', label: 'MD5', note: 'Checksums only. Broken for security.' },
  { id: 'SHA-1', label: 'SHA-1', note: 'Legacy. Broken for signatures.' },
  { id: 'SHA-256', label: 'SHA-256', note: '' },
  { id: 'SHA-384', label: 'SHA-384', note: '' },
  { id: 'SHA-512', label: 'SHA-512', note: '' },
] as const;

const MAX_FILE = 200 * 1024 * 1024;

async function compute(algo: string, data: Uint8Array, key: string): Promise<Uint8Array> {
  const buf = data as unknown as BufferSource;
  if (algo === 'MD5') {
    const out = key ? md5.hmac.arrayBuffer(key, data) : md5.arrayBuffer(data);
    return new Uint8Array(out);
  }
  if (key) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: algo }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, buf));
  }
  return new Uint8Array(await crypto.subtle.digest(algo, buf));
}

export default function HashGenerator() {
  const [source, setSource] = useState<Source>('text');
  const [text, setText] = useState('hello world');
  const [file, setFile] = useState<{ name: string; size: number; data: Uint8Array } | null>(null);
  const [fileError, setFileError] = useState('');
  const [hmacOn, setHmacOn] = useState(false);
  const [key, setKey] = useState('');
  const [encoding, setEncoding] = useState<Encoding>('hex');
  const [upper, setUpper] = useState(false);
  const [expected, setExpected] = useState('');
  const [hashes, setHashes] = useState<Record<string, Uint8Array>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const data: Uint8Array | null = source === 'text' ? new TextEncoder().encode(text) : file?.data ?? null;
  const hmacKey = hmacOn ? key : '';

  useEffect(() => {
    if (!data || (source === 'text' && !text)) {
      setHashes({});
      return;
    }
    if (hmacOn && !key) {
      setHashes({});
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError('');
    (async () => {
      try {
        const entries = await Promise.all(ALGOS.map(async (a) => [a.id, await compute(a.id, data, hmacKey)] as const));
        if (!cancelled) setHashes(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setError('Hashing failed. Your browser may not support the Web Crypto API on this page (it requires HTTPS).');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, file, source, hmacOn, key]);

  async function onFile(f: File | undefined) {
    setFileError('');
    setFile(null);
    if (!f) return;
    if (f.size > MAX_FILE) return setFileError(`That file is ${formatBytes(f.size)}. The limit is ${formatBytes(MAX_FILE)}.`);
    try {
      setFile({ name: f.name, size: f.size, data: new Uint8Array(await f.arrayBuffer()) });
    } catch {
      setFileError('The file could not be read.');
    }
  }

  const show = (bytes: Uint8Array) => {
    const s = encoding === 'hex' ? bytesToHex(bytes) : bytesToBase64(bytes);
    return encoding === 'hex' && upper ? s.toUpperCase() : s;
  };

  const norm = (s: string) => s.replace(/\s+/g, '');
  const target = norm(expected);
  const matchId = target
    ? ALGOS.find((a) => {
        const b = hashes[a.id];
        if (!b) return false;
        return norm(bytesToHex(b)).toLowerCase() === target.toLowerCase() || bytesToBase64(b) === target;
      })?.id
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented<Source>
          label="Input type"
          value={source}
          onChange={setSource}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'file', label: 'File' },
          ]}
        />
        <Segmented<Encoding>
          label="Output encoding"
          value={encoding}
          onChange={setEncoding}
          options={[
            { value: 'hex', label: 'Hex' },
            { value: 'base64', label: 'Base64' },
          ]}
        />
        {encoding === 'hex' ? <Toggle checked={upper} onChange={setUpper} label="Uppercase" /> : null}
        <Toggle checked={hmacOn} onChange={setHmacOn} label="HMAC with secret key" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {source === 'text' ? (
            <Panel
              title="Text"
              actions={
                <Button size="sm" variant="ghost" onClick={() => setText('')} disabled={!text}>
                  <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
                </Button>
              }
            >
              <div className="p-3">
                <TextArea aria-label="Text to hash" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text" className="!h-40" />
                <p className="mt-2 text-xs text-muted">Hashed as UTF-8. A trailing line break changes the result.</p>
              </div>
            </Panel>
          ) : (
            <Panel title="File">
              <div className="space-y-3 p-3">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center text-sm text-muted transition-colors hover:border-accent hover:text-ink">
                  <Upload className="h-5 w-5" aria-hidden />
                  <span>Choose a file (up to {formatBytes(MAX_FILE)}). It stays on your device.</span>
                  <input type="file" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                {fileError ? <Notice kind="error">{fileError}</Notice> : null}
                {file ? (
                  <p className="text-sm">
                    <span className="font-medium">{file.name}</span> <span className="text-muted">({formatBytes(file.size)})</span>
                  </p>
                ) : null}
              </div>
            </Panel>
          )}

          {hmacOn ? (
            <Panel title="HMAC key">
              <div className="p-3">
                <Field label="Secret key" htmlFor="hmac-key">
                  <Input id="hmac-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Enter a secret key" />
                </Field>
              </div>
            </Panel>
          ) : null}

          <Panel title="Compare with a known hash">
            <div className="space-y-3 p-3">
              <Input aria-label="Expected hash" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Paste the expected checksum" className="code" />
              {target ? (
                matchId ? (
                  <Notice kind="success">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> Match: {matchId}
                    </span>
                  </Notice>
                ) : Object.keys(hashes).length ? (
                  <Notice kind="error">No match. The hash differs from every algorithm shown.</Notice>
                ) : null
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel title={hmacOn ? 'HMAC results' : 'Hashes'}>
          <div className="divide-y divide-line" aria-live="polite" aria-busy={busy}>
            {ALGOS.map((a) => {
              const bytes = hashes[a.id];
              const value = bytes ? show(bytes) : '';
              return (
                <div key={a.id} className={`px-3 py-3 ${matchId === a.id ? 'bg-ok/10' : ''}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {hmacOn ? `HMAC-${a.label}` : a.label}
                      {a.note ? <span className="ml-2 text-xs font-normal text-muted">{a.note}</span> : null}
                    </span>
                    <CopyButton text={value} disabled={!value} />
                  </div>
                  <p className="code break-all text-ink/90">{value || <span className="text-muted">{hmacOn && !key ? 'Enter a key' : source === 'file' && !file ? 'Choose a file' : 'Enter some input'}</span>}</p>
                </div>
              );
            })}
          </div>
          {error ? (
            <div className="p-3">
              <Notice kind="error">{error}</Notice>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
