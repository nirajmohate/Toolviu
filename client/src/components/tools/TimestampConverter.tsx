'use client';

import { useEffect, useMemo, useState } from 'react';
import { Notice, Panel, Field, Input, Select, Segmented, Button } from '../ui';
import { CopyButton } from '../CopyButton';
import { relativeTime } from '@/lib/time';
import { allZones, formatInZone, localZone, toInputValue, zonedToEpoch } from '@/lib/tz';

type Unit = 'auto' | 's' | 'ms';

const MAX_MS = 8.64e15;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="code break-all">{value}</p>
      </div>
      <CopyButton text={value} size="sm" variant="ghost" iconOnly label={`Copy ${label}`} />
    </div>
  );
}

export default function TimestampConverter() {
  const [now, setNow] = useState<number | null>(null);
  const [tz, setTz] = useState('UTC');
  const [zones, setZones] = useState<string[]>(['UTC']);
  const [tsInput, setTsInput] = useState('');
  const [unit, setUnit] = useState<Unit>('auto');
  const [dateInput, setDateInput] = useState('');

  useEffect(() => {
    const local = localZone();
    const list = allZones();
    setZones(list.includes(local) ? list : [local, ...list]);
    setTz(local);
    const t = Date.now();
    setNow(t);
    setTsInput(String(Math.floor(t / 1000)));
    setDateInput(toInputValue(t, local));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo(() => {
    const raw = tsInput.trim();
    if (!raw) return { kind: 'empty' as const };
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return { kind: 'error' as const, message: 'Enter a number, for example 1700000000 or 1700000000000.' };
    const n = Number(raw);
    const digits = String(Math.abs(Math.trunc(n))).length;
    const unitUsed: 's' | 'ms' = unit === 'auto' ? (digits >= 13 ? 'ms' : 's') : unit;
    const ms = unitUsed === 'ms' ? Math.round(n) : Math.round(n * 1000);
    if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) return { kind: 'error' as const, message: 'That value is outside the range of dates JavaScript can represent.' };
    return { kind: 'ok' as const, ms, unitUsed };
  }, [tsInput, unit]);

  const fromDate = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dateInput);
    if (!m) return null;
    const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number);
    try {
      return zonedToEpoch(y, mo, d, h, mi, s, tz);
    } catch {
      return null;
    }
  }, [dateInput, tz]);

  const secs = parsed.kind === 'ok' ? Math.floor(parsed.ms / 1000) : null;
  const snippetTs = secs ?? (now ? Math.floor(now / 1000) : 1700000000);

  const snippets: [string, string, string][] = [
    ['JavaScript', 'Math.floor(Date.now() / 1000)', `new Date(${snippetTs} * 1000).toISOString()`],
    ['Python', 'int(time.time())', `datetime.fromtimestamp(${snippetTs}, tz=timezone.utc)`],
    ['PHP', 'time()', `gmdate('c', ${snippetTs})`],
    ['Go', 'time.Now().Unix()', `time.Unix(${snippetTs}, 0).UTC()`],
    ['Java', 'Instant.now().getEpochSecond()', `Instant.ofEpochSecond(${snippetTs})`],
    ['Ruby', 'Time.now.to_i', `Time.at(${snippetTs}).utc`],
    ['Bash', 'date +%s', `date -u -d @${snippetTs}`],
    ['MySQL', 'UNIX_TIMESTAMP()', `FROM_UNIXTIME(${snippetTs})`],
    ['PostgreSQL', 'EXTRACT(EPOCH FROM now())::bigint', `to_timestamp(${snippetTs})`],
  ];

  return (
    <div className="space-y-4">
      <Panel title="Current Unix time">
        <div className="flex flex-wrap items-end justify-between gap-4 p-4">
          <div>
            <p className="font-display text-4xl font-bold tabular-nums sm:text-5xl" aria-live="off">
              {now === null ? '\u2014' : Math.floor(now / 1000)}
            </p>
            <p className="mt-1 text-sm text-muted">
              seconds since 1 January 1970 UTC. In milliseconds: <span className="font-mono tabular-nums">{now ?? '\u2014'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={() => String(Math.floor(Date.now() / 1000))} label="Copy seconds" />
            <CopyButton text={() => String(Date.now())} label="Copy ms" />
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Time zone
          <Select value={tz} onChange={(e) => setTz(e.target.value)} className="h-8 w-64" aria-label="Time zone">
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Timestamp to date">
          <div className="space-y-3 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Unix timestamp" htmlFor="ts-input" className="min-w-[14rem] flex-1">
                <Input id="ts-input" inputMode="decimal" value={tsInput} onChange={(e) => setTsInput(e.target.value)} className="code" placeholder="1700000000" />
              </Field>
              <Segmented<Unit>
                label="Unit"
                value={unit}
                onChange={setUnit}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 's', label: 'Seconds' },
                  { value: 'ms', label: 'Milliseconds' },
                ]}
              />
            </div>
            {parsed.kind === 'error' ? <Notice kind="error">{parsed.message}</Notice> : null}
          </div>
          {parsed.kind === 'ok' ? (
            <div className="divide-y divide-line border-t border-line" aria-live="polite">
              <p className="px-3 py-2 text-xs text-muted">Read as {parsed.unitUsed === 'ms' ? 'milliseconds' : 'seconds'}.</p>
              <Row label="ISO 8601 (UTC)" value={new Date(parsed.ms).toISOString()} />
              <Row label={`In ${tz}`} value={formatInZone(parsed.ms, tz)} />
              <Row label="RFC 2822" value={new Date(parsed.ms).toUTCString()} />
              {now !== null ? <Row label="Relative" value={relativeTime(parsed.ms, now)} /> : null}
              <Row label="Seconds" value={String(Math.floor(parsed.ms / 1000))} />
              <Row label="Milliseconds" value={String(parsed.ms)} />
            </div>
          ) : null}
        </Panel>

        <Panel title="Date to timestamp" actions={<Button size="sm" variant="ghost" onClick={() => now && setDateInput(toInputValue(Date.now(), tz))}>Now</Button>}>
          <div className="space-y-3 p-3">
            <Field label={`Date and time in ${tz}`} htmlFor="date-input">
              <Input id="date-input" type="datetime-local" step={1} value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            </Field>
            {!fromDate && dateInput ? <Notice kind="error">Enter a complete date and time.</Notice> : null}
          </div>
          {fromDate !== null ? (
            <div className="divide-y divide-line border-t border-line" aria-live="polite">
              <Row label="Seconds" value={String(Math.floor(fromDate / 1000))} />
              <Row label="Milliseconds" value={String(fromDate)} />
              <Row label="ISO 8601 (UTC)" value={new Date(fromDate).toISOString()} />
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel title="Code snippets">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-medium">Language</th>
                <th className="px-3 py-2 font-medium">Current timestamp</th>
                <th className="px-3 py-2 font-medium">Convert {snippetTs}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {snippets.map(([lang, cur, conv]) => (
                <tr key={lang}>
                  <td className="px-3 py-2 font-medium">{lang}</td>
                  <td className="px-3 py-2 font-mono text-[13px]">{cur}</td>
                  <td className="px-3 py-2 font-mono text-[13px]">{conv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
