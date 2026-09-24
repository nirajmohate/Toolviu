'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button, Field, Input, Notice, Panel, Segmented, TextArea, Toggle } from '../ui';
import { CopyButton } from '../CopyButton';
import { ShareButton, useShareLoader } from '../ShareButton';

type Mode = 'encode' | 'decode';
type Scope = 'component' | 'full';

const SAMPLE_URL = 'https://shop.example.com:8443/search/caf%C3%A9?q=hello+world&tag=a&tag=b&redirect=https%3A%2F%2Fexample.org%2Fdone#results';

export default function UrlTool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [scope, setScope] = useState<Scope>('component');
  const [plus, setPlus] = useState(false);
  const [input, setInput] = useState('');
  const [inspect, setInspect] = useState(SAMPLE_URL);
  const deferred = useDeferredValue(input);

  const { error: shareError } = useShareLoader<{ mode: Mode; scope: Scope; input: string; plus?: boolean }>('url-encoder-decoder', (p) => {
    setMode(p.mode ?? 'encode');
    setScope(p.scope ?? 'component');
    setInput(p.input ?? '');
    setPlus(Boolean(p.plus));
  });

  const result = useMemo(() => {
    if (!deferred) return { text: '', error: '' };
    try {
      if (mode === 'encode') {
        let out = scope === 'component' ? encodeURIComponent(deferred) : encodeURI(deferred);
        if (plus) out = out.replace(/%20/g, '+');
        return { text: out, error: '' };
      }
      const src = plus ? deferred.replace(/\+/g, ' ') : deferred;
      return { text: scope === 'component' ? decodeURIComponent(src) : decodeURI(src), error: '' };
    } catch {
      return { text: '', error: 'Malformed input: a % sign is not followed by two valid hex digits, or the sequence is not valid UTF-8.' };
    }
  }, [deferred, mode, scope, plus]);

  const parsed = useMemo(() => {
    const raw = inspect.trim();
    if (!raw) return null;
    try {
      const u = new URL(raw);
      const params: [string, string][] = [];
      u.searchParams.forEach((v, k) => params.push([k, v]));
      return { ok: true as const, u, params };
    } catch {
      return { ok: false as const };
    }
  }, [inspect]);

  const decodeSafe = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Segmented<Mode>
            label="Direction"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'encode', label: 'Encode' },
              { value: 'decode', label: 'Decode' },
            ]}
          />
          <Segmented<Scope>
            label="Scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'component', label: 'Component' },
              { value: 'full', label: 'Full URL' },
            ]}
          />
          <Toggle checked={plus} onChange={setPlus} label={mode === 'encode' ? 'Use + for spaces (form style)' : 'Treat + as a space'} />
        </div>
        <p className="text-xs text-muted">
          {scope === 'component'
            ? 'Component mode (encodeURIComponent) encodes everything that could break a single value, including / ? & = and #. Use it for query values and path segments.'
            : 'Full URL mode (encodeURI) keeps the characters that give a URL its structure, such as : / ? & = and #.'}
        </p>
        {shareError ? <Notice kind="error">{shareError}</Notice> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Input"
            actions={
              <Button size="sm" variant="ghost" onClick={() => setInput('')} disabled={!input}>
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
            }
          >
            <div className="p-3">
              <TextArea aria-label="Input" rows={8} value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === 'encode' ? 'Text to encode, for example: caf\u00e9 & cr\u00e8me?' : 'Text to decode, for example: caf%C3%A9%20%26%20cr%C3%A8me%3F'} className="!h-48 break-all !whitespace-pre-wrap" />
            </div>
          </Panel>
          <Panel
            title="Result"
            actions={
              <>
                <CopyButton text={result.text} disabled={!result.text} />
                <ShareButton tool="url-encoder-decoder" getPayload={() => ({ mode, scope, input, plus })} disabled={!input} />
              </>
            }
          >
            <div className="p-3">
              <TextArea aria-label="Result" rows={8} readOnly value={result.text} placeholder="The result appears here" className="!h-48 break-all !whitespace-pre-wrap" />
            </div>
          </Panel>
        </div>
        {result.error ? <Notice kind="error">{result.error}</Notice> : null}
      </div>

      <Panel title="URL inspector">
        <div className="space-y-4 p-3">
          <Field label="Paste a full URL to break it into parts" htmlFor="url-inspect">
            <Input id="url-inspect" value={inspect} onChange={(e) => setInspect(e.target.value)} className="code" placeholder="https://example.com/path?x=1#section" />
          </Field>
          {parsed && !parsed.ok ? <Notice kind="error">That is not a complete URL. Include the scheme, for example https://</Notice> : null}
          {parsed && parsed.ok ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <dl className="divide-y divide-line rounded-md border border-line text-sm">
                {[
                  ['Protocol', parsed.u.protocol],
                  ['Host', parsed.u.hostname],
                  ['Port', parsed.u.port || '(default)'],
                  ['Path', decodeSafe(parsed.u.pathname)],
                  ['Query', parsed.u.search ? decodeSafe(parsed.u.search) : '(none)'],
                  ['Hash', parsed.u.hash ? decodeSafe(parsed.u.hash) : '(none)'],
                  ['Origin', parsed.u.origin],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 px-3 py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-all font-mono text-[13px]">{v}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="mb-2 font-sans text-sm font-semibold tracking-normal">Query parameters ({parsed.params.length})</h3>
                {parsed.params.length ? (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-muted">
                      <tr className="border-b border-line">
                        <th className="py-1.5 pr-3 font-medium">Name</th>
                        <th className="py-1.5 font-medium">Value (decoded)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {parsed.params.map(([k, v], i) => (
                        <tr key={i} className="align-top">
                          <td className="break-all py-1.5 pr-3 font-mono text-[13px] text-accent">{k}</td>
                          <td className="break-all py-1.5 font-mono text-[13px]">{v || <span className="text-muted">(empty)</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted">This URL has no query parameters.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
