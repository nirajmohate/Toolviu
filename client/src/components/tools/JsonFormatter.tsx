'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { ClipboardPaste, Download, Eraser, FileJson, Wand2 } from 'lucide-react';
import { Button, Notice, Panel, Segmented, Select, Toggle } from '../ui';
import { CodeArea } from '../CodeArea';
import { CopyButton } from '../CopyButton';
import { ShareButton, useShareLoader } from '../ShareButton';
import { printJson, repairJson, SAMPLE_JSON, tryParse } from '@/lib/json';
import { downloadText } from '@/lib/download';
import { formatBytes, readClipboard, utf8Length } from '@/lib/format';

type Mode = 'format' | 'minify';
type Indent = '2' | '4' | 'tab';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('format');
  const [indent, setIndent] = useState<Indent>('2');
  const [sortKeys, setSortKeys] = useState(false);
  const [note, setNote] = useState<{ kind: 'info' | 'error' | 'success'; text: string } | null>(null);
  const deferred = useDeferredValue(input);

  const { error: shareError, loading: shareLoading } = useShareLoader<{ input: string }>('json-formatter', (p) => setInput(p.input ?? ''));

  const result = useMemo(() => {
    if (!deferred.trim()) return { kind: 'empty' as const };
    const parsed = tryParse(deferred);
    if (!parsed.ok) return { kind: 'error' as const, error: parsed.error };
    const ind = mode === 'minify' ? '' : indent === 'tab' ? '\t' : ' '.repeat(Number(indent));
    return { kind: 'ok' as const, text: printJson(parsed.node, { indent: ind, sortKeys }) };
  }, [deferred, mode, indent, sortKeys]);

  const output = result.kind === 'ok' ? result.text : '';

  function autoFix() {
    const fixed = repairJson(input);
    const parsed = tryParse(fixed);
    if (parsed.ok) {
      setInput(fixed);
      setNote({ kind: 'success', text: 'Fixed comments, trailing commas, quotes or unquoted keys. Check the result.' });
    } else {
      setNote({ kind: 'error', text: `Auto-fix could not repair this. Remaining problem at line ${parsed.error.line}, column ${parsed.error.column}: ${parsed.error.message}.` });
    }
  }

  async function paste() {
    const text = await readClipboard();
    if (text === null) setNote({ kind: 'info', text: 'Your browser blocked clipboard access. Paste with Ctrl+V or Cmd+V instead.' });
    else {
      setInput(text);
      setNote(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented<Mode>
          label="Output mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'format', label: 'Format' },
            { value: 'minify', label: 'Minify' },
          ]}
        />
        {mode === 'format' ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            Indent
            <Select value={indent} onChange={(e) => setIndent(e.target.value as Indent)} className="h-8 w-32" aria-label="Indent size">
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </Select>
          </label>
        ) : null}
        <Toggle checked={sortKeys} onChange={setSortKeys} label="Sort keys A to Z" />
      </div>

      {shareError ? <Notice kind="error">{shareError}</Notice> : null}
      {shareLoading ? <Notice>Loading shared JSON&hellip;</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Input"
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={paste}>
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Paste
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLE_JSON); setNote(null); }}>
                <FileJson className="h-3.5 w-3.5" aria-hidden /> Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput(''); setNote(null); }} disabled={!input}>
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
            </>
          }
        >
          <CodeArea ariaLabel="JSON input" value={input} onChange={(v) => { setInput(v); setNote(null); }} placeholder='Paste your JSON here, for example {"name":"Ada"}' errorLine={result.kind === 'error' ? result.error.line : null} />
        </Panel>

        <Panel
          title={mode === 'minify' ? 'Minified JSON' : 'Formatted JSON'}
          actions={
            <>
              <CopyButton text={output} disabled={!output} />
              <Button size="sm" onClick={() => downloadText('data.json', output, 'application/json')} disabled={!output}>
                <Download className="h-3.5 w-3.5" aria-hidden /> Download
              </Button>
              <ShareButton tool="json-formatter" getPayload={() => ({ input })} disabled={!input.trim()} />
            </>
          }
        >
          <CodeArea ariaLabel="Formatted JSON output" value={output} readOnly placeholder="The result appears here" />
        </Panel>
      </div>

      {result.kind === 'error' ? (
        <Notice kind="error">
          <p className="font-medium">
            Invalid JSON at line {result.error.line}, column {result.error.column}
          </p>
          <p className="mt-0.5">{result.error.message}.</p>
          <Button size="sm" className="mt-2" onClick={autoFix}>
            <Wand2 className="h-3.5 w-3.5" aria-hidden /> Try auto-fix
          </Button>
        </Notice>
      ) : null}
      {note ? <Notice kind={note.kind}>{note.text}</Notice> : null}
      {result.kind === 'ok' ? (
        <p className="text-sm text-muted" aria-live="polite">
          Valid JSON. Input {formatBytes(utf8Length(deferred))}, output {formatBytes(utf8Length(output))}.
        </p>
      ) : null}
    </div>
  );
}
