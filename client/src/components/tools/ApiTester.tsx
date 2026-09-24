'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import { Button, Input, Notice, Panel, Segmented, Select, TextArea, Toggle } from '../ui';
import { CodeArea } from '../CodeArea';
import { CopyButton } from '../CopyButton';
import { apiFetch } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { printJson, tryParse } from '@/lib/json';
import { readStorage, writeStorage } from '@/lib/storage';
import { cn } from '@/lib/cn';

type Row = { id: number; key: string; value: string; on: boolean };
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type ReqTab = 'params' | 'headers' | 'body' | 'auth';
type BodyType = 'none' | 'json' | 'text' | 'form';
type AuthType = 'none' | 'bearer' | 'basic';
type Mode = 'proxy' | 'browser';

type ApiResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  timeMs: number;
  sizeBytes: number;
  truncated: boolean;
  isBinary: boolean;
  contentType: string;
  body: string | null;
  finalUrl: string;
  redirects: { status: number; from: string; to: string }[];
};

type HistoryItem = { method: Method; url: string };
const HISTORY_KEY = 'api-tester-history';
const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

let rowId = 1;
const newRow = (key = '', value = ''): Row => ({ id: rowId++, key, value, on: true });

function KeyValueEditor({ rows, onChange, keyPlaceholder, valuePlaceholder, label }: { rows: Row[]; onChange: (r: Row[]) => void; keyPlaceholder: string; valuePlaceholder: string; label: string }) {
  const update = (id: number, patch: Partial<Row>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2 p-3">
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2">
          <input type="checkbox" checked={r.on} onChange={(e) => update(r.id, { on: e.target.checked })} aria-label={`Enable ${label} ${i + 1}`} className="h-4 w-4 shrink-0" />
          <Input value={r.key} onChange={(e) => update(r.id, { key: e.target.value })} placeholder={keyPlaceholder} aria-label={`${label} name ${i + 1}`} className="code h-8 flex-1" />
          <Input value={r.value} onChange={(e) => update(r.id, { value: e.target.value })} placeholder={valuePlaceholder} aria-label={`${label} value ${i + 1}`} className="code h-8 flex-[1.4]" />
          <button type="button" onClick={() => onChange(rows.length > 1 ? rows.filter((x) => x.id !== r.id) : [newRow()])} aria-label={`Remove ${label} ${i + 1}`} className="rounded p-1.5 text-muted hover:bg-sunken hover:text-danger">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...rows, newRow()])}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add {label.toLowerCase()}
      </Button>
    </div>
  );
}

const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export default function ApiTester() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [tab, setTab] = useState<ReqTab>('params');
  const [params, setParams] = useState<Row[]>([newRow()]);
  const [headers, setHeaders] = useState<Row[]>([newRow('Accept', 'application/json')]);
  const [bodyType, setBodyType] = useState<BodyType>('json');
  const [body, setBody] = useState('');
  const [authType, setAuthType] = useState<AuthType>('none');
  const [token, setToken] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState<Mode>('proxy');
  const [follow, setFollow] = useState(true);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');
  const [resTab, setResTab] = useState<'body' | 'headers'>('body');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setHistory(readStorage<HistoryItem[]>(HISTORY_KEY, [])), []);

  const hasBody = method !== 'GET' && method !== 'HEAD';

  /** The request exactly as it will be sent. */
  const built = useMemo(() => {
    let finalUrl = url.trim();
    const activeParams = params.filter((p) => p.on && p.key.trim());
    if (activeParams.length && finalUrl) {
      try {
        const u = new URL(finalUrl);
        activeParams.forEach((p) => u.searchParams.append(p.key.trim(), p.value));
        finalUrl = u.toString();
      } catch {
        /* invalid URL is reported on send */
      }
    }
    const h: Record<string, string> = {};
    headers.filter((r) => r.on && r.key.trim()).forEach((r) => (h[r.key.trim()] = r.value));
    const has = (name: string) => Object.keys(h).some((k) => k.toLowerCase() === name);
    if (authType === 'bearer' && token.trim() && !has('authorization')) h.Authorization = `Bearer ${token.trim()}`;
    if (authType === 'basic' && (user || pass) && !has('authorization')) h.Authorization = `Basic ${toBase64(`${user}:${pass}`)}`;
    let payload: string | undefined;
    if (hasBody && bodyType !== 'none' && body !== '') {
      payload = body;
      if (!has('content-type')) h['Content-Type'] = bodyType === 'json' ? 'application/json' : bodyType === 'form' ? 'application/x-www-form-urlencoded' : 'text/plain';
    }
    return { url: finalUrl, headers: h, body: payload };
  }, [url, params, headers, authType, token, user, pass, hasBody, bodyType, body]);

  const curl = useMemo(() => {
    const parts = [`curl -X ${method} ${shq(built.url || 'https://example.com')}`];
    Object.entries(built.headers).forEach(([k, v]) => parts.push(`-H ${shq(`${k}: ${v}`)}`));
    if (built.body !== undefined) parts.push(`--data-raw ${shq(built.body)}`);
    return parts.join(' \\\n  ');
  }, [method, built]);

  const fetchSnippet = useMemo(() => {
    const opts: string[] = [`  method: '${method}'`];
    if (Object.keys(built.headers).length) opts.push(`  headers: ${JSON.stringify(built.headers, null, 4).replace(/\n/g, '\n  ')}`);
    if (built.body !== undefined) opts.push(`  body: ${JSON.stringify(built.body)}`);
    return `const response = await fetch(${JSON.stringify(built.url || 'https://example.com')}, {\n${opts.join(',\n')},\n});\nconst data = await response.text();`;
  }, [method, built]);

  function remember(item: HistoryItem) {
    const next = [item, ...history.filter((h) => !(h.method === item.method && h.url === item.url))].slice(0, 10);
    setHistory(next);
    writeStorage(HISTORY_KEY, next);
  }

  async function send() {
    setError('');
    setResponse(null);
    if (!built.url) return setError('Enter a URL first.');
    try {
      const u = new URL(built.url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return setError('Only http:// and https:// URLs are supported.');
    } catch {
      return setError('That does not look like a valid URL. Start with http:// or https://');
    }
    if (bodyType === 'json' && built.body) {
      const p = tryParse(built.body);
      if (!p.ok) return setError(`The JSON body is invalid (line ${p.error.line}, column ${p.error.column}: ${p.error.message}).`);
    }

    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (mode === 'proxy') {
        const res = await apiFetch<ApiResponse & { ok: true }>('/api/proxy', {
          method: 'POST',
          signal: controller.signal,
          body: JSON.stringify({ url: built.url, method, headers: built.headers, body: built.body, followRedirects: follow }),
        });
        setResponse(res);
      } else {
        const started = performance.now();
        const res = await fetch(built.url, { method, headers: built.headers, body: built.body, redirect: follow ? 'follow' : 'manual', signal: controller.signal });
        const buf = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || '';
        const isText = buf.byteLength === 0 || !contentType || /(text|json|xml|javascript|html|csv|yaml|form-urlencoded|svg|graphql)/i.test(contentType);
        const hdrs: Record<string, string> = {};
        res.headers.forEach((v, k) => (hdrs[k] = v));
        setResponse({
          status: res.status,
          statusText: res.statusText,
          headers: hdrs,
          timeMs: Math.round(performance.now() - started),
          sizeBytes: buf.byteLength,
          truncated: false,
          isBinary: !isText,
          contentType,
          body: isText ? new TextDecoder().decode(buf) : null,
          finalUrl: res.url || built.url,
          redirects: [],
        });
      }
      setResTab('body');
      remember({ method, url: url.trim() });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      if (mode === 'browser' && e instanceof TypeError) {
        setError('The browser could not complete the request. Either the server is not reachable, or it does not allow requests from this site (CORS). For public APIs, switch to Proxy mode.');
      } else {
        setError(e instanceof Error ? e.message : 'The request failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  const bodyView = useMemo(() => {
    if (!response || response.body === null) return { text: '', json: false };
    const looksJson = /json/i.test(response.contentType) || /^\s*[\[{]/.test(response.body);
    if (looksJson) {
      const p = tryParse(response.body);
      if (p.ok) return { text: printJson(p.node, { indent: '  ' }), json: true };
    }
    return { text: response.body, json: false };
  }, [response]);

  const statusColor = !response ? '' : response.status >= 400 ? 'bg-danger/15 text-danger' : response.status >= 300 ? 'bg-mark/40 text-ink' : 'bg-ok/15 text-ok';

  return (
    <div className="space-y-4">
      <Panel>
        <div className="space-y-3 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Method)} aria-label="HTTP method" className="w-full font-mono font-semibold sm:w-32">
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) send();
              }}
              aria-label="Request URL"
              placeholder="https://api.example.com/users"
              className="code flex-1"
            />
            <Button variant="primary" onClick={send} disabled={loading} className="sm:w-28">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Send
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Segmented<Mode>
              label="Request mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'proxy', label: 'Proxy' },
                { value: 'browser', label: 'Browser' },
              ]}
            />
            <Toggle checked={follow} onChange={setFollow} label="Follow redirects" />
            {history.length ? (
              <Select
                aria-label="Recent requests"
                value=""
                onChange={(e) => {
                  const h = history[Number(e.target.value)];
                  if (h) {
                    setMethod(h.method);
                    setUrl(h.url);
                  }
                }}
                className="h-8 w-48 text-[13px]"
              >
                <option value="">Recent requests&hellip;</option>
                {history.map((h, i) => (
                  <option key={i} value={i}>
                    {h.method} {h.url.replace(/^https?:\/\//, '').slice(0, 40)}
                  </option>
                ))}
              </Select>
            ) : null}
            {history.length ? (
              <Button size="sm" variant="ghost" onClick={() => { setHistory([]); writeStorage(HISTORY_KEY, []); }}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear history
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            {mode === 'proxy'
              ? 'Proxy mode sends the request from our server, so it works with any public API and avoids CORS errors. Requests are not stored. Private and localhost addresses are blocked.'
              : 'Browser mode sends the request straight from your device. Use it for localhost or private APIs. The API must allow CORS from this site.'}
          </p>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Request"
          actions={
            <Segmented<ReqTab>
              label="Request sections"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'params', label: 'Params' },
                { value: 'headers', label: 'Headers' },
                { value: 'body', label: 'Body' },
                { value: 'auth', label: 'Auth' },
              ]}
            />
          }
        >
          <div className="min-h-[18rem]">
            {tab === 'params' ? <KeyValueEditor rows={params} onChange={setParams} keyPlaceholder="name" valuePlaceholder="value" label="Parameter" /> : null}
            {tab === 'headers' ? <KeyValueEditor rows={headers} onChange={setHeaders} keyPlaceholder="Header-Name" valuePlaceholder="value" label="Header" /> : null}
            {tab === 'body' ? (
              <div className="space-y-3 p-3">
                {!hasBody ? (
                  <Notice>{method} requests do not have a body. Choose POST, PUT, PATCH or DELETE to add one.</Notice>
                ) : (
                  <>
                    <Segmented<BodyType>
                      label="Body type"
                      value={bodyType}
                      onChange={setBodyType}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'json', label: 'JSON' },
                        { value: 'form', label: 'Form' },
                        { value: 'text', label: 'Text' },
                      ]}
                    />
                    {bodyType !== 'none' ? (
                      <TextArea
                        aria-label="Request body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={10}
                        placeholder={bodyType === 'json' ? '{\n  "title": "Hello"\n}' : bodyType === 'form' ? 'name=Ada&role=admin' : 'Plain text body'}
                        className="!h-52"
                      />
                    ) : null}
                    {bodyType === 'json' && !body ? (
                      <Button size="sm" variant="ghost" onClick={() => setBody('{\n  "title": "Hello from the API tester",\n  "body": "Testing",\n  "userId": 1\n}')}>
                        Insert an example body
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            {tab === 'auth' ? (
              <div className="space-y-3 p-3">
                <Segmented<AuthType>
                  label="Authentication"
                  value={authType}
                  onChange={setAuthType}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'bearer', label: 'Bearer token' },
                    { value: 'basic', label: 'Basic' },
                  ]}
                />
                {authType === 'bearer' ? <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token" aria-label="Bearer token" className="code" /> : null}
                {authType === 'basic' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username" aria-label="Username" />
                    <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" aria-label="Password" />
                  </div>
                ) : null}
                {authType !== 'none' ? <p className="text-xs text-muted">Sets the Authorization header. Credentials are never saved in history.</p> : null}
              </div>
            ) : null}
          </div>
          <details className="border-t border-line">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">Copy as code</summary>
            <div className="space-y-3 px-3 pb-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">cURL</span>
                  <CopyButton text={curl} />
                </div>
                <pre className="code scroll-thin overflow-x-auto rounded-md bg-sunken p-3">{curl}</pre>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">JavaScript fetch</span>
                  <CopyButton text={fetchSnippet} />
                </div>
                <pre className="code scroll-thin overflow-x-auto rounded-md bg-sunken p-3">{fetchSnippet}</pre>
              </div>
            </div>
          </details>
        </Panel>

        <Panel
          title="Response"
          actions={
            response ? (
              <Segmented<'body' | 'headers'>
                label="Response sections"
                value={resTab}
                onChange={setResTab}
                options={[
                  { value: 'body', label: 'Body' },
                  { value: 'headers', label: `Headers (${Object.keys(response.headers).length})` },
                ]}
              />
            ) : null
          }
        >
          {error ? (
            <div className="p-3">
              <Notice kind="error">{error}</Notice>
            </div>
          ) : null}
          {loading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Waiting for the response&hellip;
            </p>
          ) : null}
          {!response && !error && !loading ? <p className="p-4 text-sm text-muted">Press Send to see the response. Try the default URL to get started.</p> : null}
          {response ? (
            <div aria-live="polite">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-3 py-2 text-sm">
                <span className={cn('rounded px-2 py-0.5 font-mono font-semibold', statusColor)}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-muted">{response.timeMs} ms</span>
                <span className="text-muted">{formatBytes(response.sizeBytes)}</span>
                <span className="ml-auto">
                  <CopyButton text={resTab === 'body' ? bodyView.text : JSON.stringify(response.headers, null, 2)} />
                </span>
              </div>
              {response.redirects.length ? (
                <p className="border-b border-line px-3 py-2 text-xs text-muted">
                  Followed {response.redirects.length} redirect{response.redirects.length > 1 ? 's' : ''} to <span className="break-all font-mono">{response.finalUrl}</span>
                </p>
              ) : null}
              {response.truncated ? <p className="border-b border-line bg-mark/20 px-3 py-2 text-xs">The response was larger than the limit and has been cut off.</p> : null}
              {resTab === 'body' ? (
                response.isBinary ? (
                  <p className="p-4 text-sm text-muted">Binary response ({response.contentType || 'unknown type'}, {formatBytes(response.sizeBytes)}). It cannot be displayed as text.</p>
                ) : (
                  <CodeArea ariaLabel="Response body" value={bodyView.text} readOnly className="!h-72 !rounded-none md:!h-[22rem]" placeholder="(empty body)" />
                )
              ) : (
                <dl className="scroll-thin max-h-[22rem] divide-y divide-line overflow-auto text-sm">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="grid gap-x-3 px-3 py-1.5 sm:grid-cols-[10rem_1fr]">
                      <dt className="break-all font-mono text-[13px] text-accent">{k}</dt>
                      <dd className="break-all font-mono text-[13px]">{Array.isArray(v) ? v.join('\n') : v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
