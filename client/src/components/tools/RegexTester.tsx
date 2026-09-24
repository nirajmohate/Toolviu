'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Field, Input, Notice, Panel, Select, TextArea } from '../ui';
import { CopyButton } from '../CopyButton';
import { ShareButton, useShareLoader } from '../ShareButton';
import { runRegex, type RegexResult } from '@/lib/regexRunner';
import { cn } from '@/lib/cn';

const FLAGS: { flag: string; label: string; title: string }[] = [
  { flag: 'g', label: 'g', title: 'global: find all matches' },
  { flag: 'i', label: 'i', title: 'ignore case' },
  { flag: 'm', label: 'm', title: 'multiline: ^ and $ match at line breaks' },
  { flag: 's', label: 's', title: 'dotAll: . also matches line breaks' },
  { flag: 'u', label: 'u', title: 'unicode' },
  { flag: 'y', label: 'y', title: 'sticky: match only at lastIndex' },
];

const PRESETS: Record<string, { pattern: string; flags: string; text: string }> = {
  email: {
    pattern: '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+(?:\\.[\\w-]+)+)',
    flags: 'g',
    text: 'Contact ada@example.com or grace.hopper@navy.mil.\nNot an email: hello@ or @world',
  },
  url: {
    pattern: 'https?:\\/\\/(?:www\\.)?([\\w-]+(?:\\.[\\w-]+)+)(\\/[^\\s]*)?',
    flags: 'gi',
    text: 'Docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript\nHome: http://www.example.com',
  },
  date: {
    pattern: '(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])',
    flags: 'g',
    text: 'Released 2024-03-15, patched 2024-04-02. Invalid: 2024-13-40',
  },
  ipv4: {
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b',
    flags: 'g',
    text: 'Gateway 192.168.1.1, DNS 8.8.8.8, invalid 999.1.1.1',
  },
  hex: {
    pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b',
    flags: 'g',
    text: 'Colors: #fff, #2B3AFF, #12345, #abcdef',
  },
};

const CHEATS: [string, string][] = [
  ['.', 'Any character except line break'],
  ['\\d \\w \\s', 'Digit, word character, whitespace'],
  ['\\D \\W \\S', 'The opposite of the above'],
  ['[abc] [^abc] [a-z]', 'Any of, none of, range'],
  ['^ $', 'Start and end of input (or line with m)'],
  ['\\b \\B', 'Word boundary, not a word boundary'],
  ['* + ? {n,m}', 'Zero or more, one or more, optional, count'],
  ['*? +? ??', 'Lazy versions (match as little as possible)'],
  ['(abc) (?:abc)', 'Capturing group, non-capturing group'],
  ['(?<name>abc)', 'Named group, refer to it as $<name>'],
  ['a|b', 'Alternation: a or b'],
  ['(?=a) (?!a)', 'Lookahead: followed by, not followed by'],
  ['(?<=a) (?<!a)', 'Lookbehind: preceded by, not preceded by'],
  ['\\1 \\k<name>', 'Backreference to an earlier group'],
];

const DEFAULT = PRESETS.email;

export default function RegexTester() {
  const [pattern, setPattern] = useState(DEFAULT.pattern);
  const [flags, setFlags] = useState(DEFAULT.flags);
  const [text, setText] = useState(DEFAULT.text);
  const [replacement, setReplacement] = useState('');
  const [replaceOn, setReplaceOn] = useState(false);
  const [result, setResult] = useState<RegexResult | null>(null);
  const [running, setRunning] = useState(false);

  const { error: shareError } = useShareLoader<{ pattern: string; flags: string; text: string; replacement?: string }>('regex-tester', (p) => {
    setPattern(p.pattern ?? '');
    setFlags(p.flags ?? 'g');
    setText(p.text ?? '');
    if (p.replacement) {
      setReplacement(p.replacement);
      setReplaceOn(true);
    }
  });

  useEffect(() => {
    if (!pattern) {
      setResult(null);
      setRunning(false);
      return;
    }
    setRunning(true);
    let job: ReturnType<typeof runRegex> | null = null;
    const t = setTimeout(() => {
      job = runRegex({ pattern, flags, text, replacement: replaceOn ? replacement : null });
      job.promise.then((r) => {
        if (r.ok || r.error !== 'cancelled') {
          setResult(r);
          setRunning(false);
        }
      });
    }, 200);
    return () => {
      clearTimeout(t);
      job?.cancel();
    };
  }, [pattern, flags, text, replacement, replaceOn]);

  function toggleFlag(f: string) {
    setFlags((cur) => (cur.includes(f) ? cur.replace(f, '') : cur + f));
  }

  const matches = result?.ok ? result.matches : [];

  const highlighted = useMemo(() => {
    if (!result?.ok) return null;
    const parts: React.ReactNode[] = [];
    let pos = 0;
    result.matches.slice(0, 500).forEach((m, i) => {
      if (m.end === m.index || m.index < pos) return;
      if (m.index > pos) parts.push(<Fragment key={`t${i}`}>{text.slice(pos, m.index)}</Fragment>);
      parts.push(
        <mark key={`m${i}`} className={i % 2 ? 'hl-alt' : 'hl'}>
          {text.slice(m.index, m.end)}
        </mark>,
      );
      pos = m.end;
    });
    parts.push(<Fragment key="rest">{text.slice(pos)}</Fragment>);
    return parts;
  }, [result, text]);

  return (
    <div className="space-y-4">
      {shareError ? <Notice kind="error">{shareError}</Notice> : null}

      <Panel
        title="Pattern"
        actions={
          <>
            <Select
              aria-label="Load an example"
              className="h-8 w-44 text-[13px]"
              value=""
              onChange={(e) => {
                const p = PRESETS[e.target.value];
                if (p) {
                  setPattern(p.pattern);
                  setFlags(p.flags);
                  setText(p.text);
                }
              }}
            >
              <option value="">Load an example&hellip;</option>
              <option value="email">Email addresses</option>
              <option value="url">URLs</option>
              <option value="date">ISO dates</option>
              <option value="ipv4">IPv4 addresses</option>
              <option value="hex">Hex colors</option>
            </Select>
            <ShareButton tool="regex-tester" getPayload={() => ({ pattern, flags, text, replacement: replaceOn ? replacement : '' })} disabled={!pattern} />
          </>
        }
      >
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg text-muted" aria-hidden>
              /
            </span>
            <Input aria-label="Regular expression" value={pattern} onChange={(e) => setPattern(e.target.value)} className="code h-10 flex-1" placeholder="Enter a regular expression" />
            <span className="font-mono text-lg text-muted" aria-hidden>
              /
            </span>
            <span className="min-w-[3ch] font-mono text-lg text-accent" aria-label={`Flags: ${flags || 'none'}`}>
              {flags}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Flags">
            {FLAGS.map(({ flag, label, title }) => (
              <button
                key={flag}
                type="button"
                title={title}
                aria-pressed={flags.includes(flag)}
                onClick={() => toggleFlag(flag)}
                className={cn('h-8 min-w-[2rem] rounded-md border px-2 font-mono text-sm transition-colors', flags.includes(flag) ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface text-muted hover:text-ink')}
              >
                {label}
              </button>
            ))}
            <span className="ml-2 self-center text-xs text-muted">{running ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" aria-label="Running" /> : null}</span>
          </div>
          {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Test text">
          <div className="p-3">
            <TextArea aria-label="Test text" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the text you want to search" className="!h-56" />
          </div>
        </Panel>
        <Panel title={result?.ok ? `Matches highlighted (${matches.length}${result.truncated ? '+' : ''})` : 'Matches highlighted'}>
          <pre className="code scroll-thin h-[16.5rem] overflow-auto whitespace-pre-wrap break-words p-3" aria-live="polite">
            {highlighted ?? <span className="text-muted">Matches appear here</span>}
          </pre>
        </Panel>
      </div>

      {result?.ok && result.truncated ? <Notice>Showing the first {matches.length} matches only.</Notice> : null}

      <Panel title="Match details">
        {matches.length ? (
          <div className="scroll-thin max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Position</th>
                  <th className="px-3 py-2 font-medium">Match</th>
                  <th className="px-3 py-2 font-medium">Groups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matches.slice(0, 200).map((m, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {m.index}&ndash;{m.end}
                    </td>
                    <td className="max-w-[18rem] break-all px-3 py-2 font-mono text-[13px]">{m.text === '' ? <span className="text-muted">(empty match)</span> : m.text}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">
                      {m.named
                        ? Object.entries(m.named).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-accent">{k}</span>: {v === null ? <span className="text-muted">undefined</span> : v}
                            </div>
                          ))
                        : null}
                      {!m.named && m.groups.length
                        ? m.groups.map((g, gi) => (
                            <div key={gi}>
                              <span className="text-accent">${gi + 1}</span>: {g === null ? <span className="text-muted">undefined</span> : g}
                            </div>
                          ))
                        : null}
                      {!m.named && !m.groups.length ? <span className="text-muted">none</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted">{result?.ok ? 'No matches.' : 'Enter a pattern to see matches.'}</p>
        )}
      </Panel>

      <Panel
        title="Replace"
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={replaceOn} onChange={(e) => setReplaceOn(e.target.checked)} className="h-4 w-4" /> Enable
          </label>
        }
      >
        {replaceOn ? (
          <div className="space-y-3 p-3">
            <Field label="Replacement" hint="Use $1, $2, $<name> and $& (whole match)" htmlFor="rx-repl">
              <Input id="rx-repl" value={replacement} onChange={(e) => setReplacement(e.target.value)} className="code" placeholder="For example: $<user> at $<domain>" />
            </Field>
            <div className="flex items-start gap-2">
              <pre className="code scroll-thin max-h-64 min-h-[4rem] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-sunken p-3" aria-live="polite">
                {result?.ok && result.replaced !== null ? result.replaced : ''}
              </pre>
              <CopyButton text={result?.ok && result.replaced !== null ? result.replaced : ''} disabled={!result?.ok} />
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted">Turn this on to preview a search and replace.</p>
        )}
      </Panel>

      <details className="panel group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">Regex cheat sheet</summary>
        <div className="grid gap-x-8 border-t border-line px-4 py-3 sm:grid-cols-2">
          {CHEATS.map(([token, desc]) => (
            <div key={token} className="flex gap-3 border-b border-line/60 py-2 text-sm last:border-0">
              <code className="w-40 shrink-0 font-mono text-[13px] text-accent">{token}</code>
              <span className="text-muted">{desc}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
