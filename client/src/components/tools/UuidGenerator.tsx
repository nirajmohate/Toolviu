'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button, Field, Input, Notice, Panel, Segmented, Select, TextArea, Toggle } from '../ui';
import { CopyButton } from '../CopyButton';
import { downloadText } from '@/lib/download';
import { inspectUuid, uuidV4, uuidV7 } from '@/lib/uuid';

type Version = 'v4' | 'v7';
type Separator = 'newline' | 'comma' | 'json';

export default function UuidGenerator() {
  const [version, setVersion] = useState<Version>('v4');
  const [count, setCount] = useState(5);
  const [raw, setRaw] = useState<string[]>([]);
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [braces, setBraces] = useState(false);
  const [separator, setSeparator] = useState<Separator>('newline');
  const [check, setCheck] = useState('');

  const generate = useCallback(() => {
    const n = Math.min(Math.max(Math.floor(count) || 1, 1), 1000);
    const make = version === 'v4' ? uuidV4 : uuidV7;
    setRaw(Array.from({ length: n }, make));
  }, [count, version]);

  // Generated on the client only, so server and browser HTML never disagree.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const formatted = useMemo(
    () =>
      raw.map((u) => {
        let s = hyphens ? u : u.replace(/-/g, '');
        if (upper) s = s.toUpperCase();
        if (braces) s = `{${s}}`;
        return s;
      }),
    [raw, upper, hyphens, braces],
  );

  const text = useMemo(() => {
    if (separator === 'comma') return formatted.join(', ');
    if (separator === 'json') return JSON.stringify(formatted, null, 2);
    return formatted.join('\n');
  }, [formatted, separator]);

  const info = check.trim() ? inspectUuid(check) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-4">
        <Panel title="Options">
          <div className="space-y-4 p-3">
            <div>
              <span className="label">Version</span>
              <Segmented<Version>
                label="UUID version"
                value={version}
                onChange={setVersion}
                options={[
                  { value: 'v4', label: 'v4 random' },
                  { value: 'v7', label: 'v7 time-ordered' },
                ]}
              />
            </div>
            <Field label="How many" hint="(1 to 1000)" htmlFor="uuid-count">
              <Input id="uuid-count" type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </Field>
            <Field label="List format" htmlFor="uuid-sep">
              <Select id="uuid-sep" value={separator} onChange={(e) => setSeparator(e.target.value as Separator)}>
                <option value="newline">One per line</option>
                <option value="comma">Comma separated</option>
                <option value="json">JSON array</option>
              </Select>
            </Field>
            <div className="space-y-2">
              <Toggle checked={hyphens} onChange={setHyphens} label="Hyphens" />
              <Toggle checked={upper} onChange={setUpper} label="Uppercase" />
              <Toggle checked={braces} onChange={setBraces} label="Braces {…}" />
            </div>
            <Button variant="primary" onClick={generate} className="w-full">
              <RefreshCw className="h-4 w-4" aria-hidden /> Generate
            </Button>
          </div>
        </Panel>

        <Panel title="Check a UUID">
          <div className="space-y-3 p-3">
            <Input aria-label="UUID to check" value={check} onChange={(e) => setCheck(e.target.value)} placeholder="Paste a UUID" className="code" />
            {info ? (
              info.valid ? (
                <Notice kind="success">
                  Valid UUID, version {info.version}. {info.variant}.
                  {info.timestamp ? <> Created {info.timestamp.toISOString()}.</> : null}
                </Notice>
              ) : (
                <Notice kind="error">Not a valid UUID. Expected 32 hex digits, usually grouped 8-4-4-4-12.</Notice>
              )
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel
        title={`${formatted.length} generated`}
        actions={
          <>
            <CopyButton text={text} disabled={!text} label="Copy all" />
            <Button size="sm" onClick={() => downloadText('uuids.txt', text)} disabled={!text}>
              <Download className="h-3.5 w-3.5" aria-hidden /> Download
            </Button>
          </>
        }
      >
        <div className="p-3">
          <TextArea aria-label="Generated UUIDs" readOnly value={text} className="!h-[26rem]" wrap="off" />
          <p className="mt-3 text-xs text-muted">Generated in your browser with the Web Crypto random number generator. Nothing is sent to a server.</p>
        </div>
      </Panel>
    </div>
  );
}
