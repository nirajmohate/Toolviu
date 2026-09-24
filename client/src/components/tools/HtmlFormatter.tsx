'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, Download, Eraser, FileCode } from 'lucide-react';
import { Button, Notice, Panel, Segmented, Select, Toggle } from '../ui';
import { CodeArea } from '../CodeArea';
import { CopyButton } from '../CopyButton';
import { ShareButton, useShareLoader } from '../ShareButton';
import { minifyCss, minifyHtml } from '@/lib/minify';
import { downloadText } from '@/lib/download';
import { formatBytes, readClipboard, utf8Length } from '@/lib/format';

type Lang = 'html' | 'css' | 'js';
type Action = 'beautify' | 'minify';

type Beautifier = { html: (s: string, o: object) => string; css: (s: string, o: object) => string; js: (s: string, o: object) => string };

const SAMPLES: Record<Lang, string> = {
  html: '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Demo</title><style>body{margin:0;font-family:sans-serif}</style></head><body><header><nav><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul></nav></header><main><h1>Hello, <em>world</em></h1><p>This is a <strong>tiny</strong> page.</p><pre>  keep\n    this   spacing</pre></main></body></html>',
  css: '/* buttons */ .btn{display:inline-flex;padding:8px 16px;border-radius:6px;background:#2b3aff;color:#fff}.btn:hover{background:#1f2be0}@media (max-width:600px){.btn{width:100%}}',
  js: 'function greet(name){if(!name){return "Hello, stranger"}const list=[1,2,3].map(n=>n*2);console.log(`Hi ${name}`,list);return {name,list}}',
};

const LABELS: Record<Lang, string> = { html: 'HTML', css: 'CSS', js: 'JavaScript' };

export default function HtmlFormatter() {
  const [lang, setLang] = useState<Lang>('html');
  const [action, setAction] = useState<Action>('beautify');
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState('2');
  const [wrap, setWrap] = useState('0');
  const [keepNewlines, setKeepNewlines] = useState(true);
  const [lib, setLib] = useState<Beautifier | null>(null);
  const [loadError, setLoadError] = useState('');
  const deferred = useDeferredValue(input);

  const { error: shareError } = useShareLoader<{ lang: Lang; input: string }>('html-formatter', (p) => {
    if (p.lang) setLang(p.lang);
    setInput(p.input ?? '');
  });

  useEffect(() => {
    import('js-beautify')
      .then((m) => setLib(((m as unknown as { default?: Beautifier }).default ?? (m as unknown as Beautifier)) as Beautifier))
      .catch(() => setLoadError('The formatter could not be loaded. Check your connection and reload the page.'));
  }, []);

  const canMinify = lang !== 'js';
  const effectiveAction: Action = canMinify ? action : 'beautify';

  const result = useMemo(() => {
    if (!deferred.trim()) return { text: '', error: '' };
    try {
      if (effectiveAction === 'minify') return { text: lang === 'html' ? minifyHtml(deferred) : minifyCss(deferred), error: '' };
      if (!lib) return { text: '', error: '' };
      const opts = {
        indent_size: indent === 'tab' ? 1 : Number(indent),
        indent_char: indent === 'tab' ? '\t' : ' ',
        wrap_line_length: Number(wrap),
        preserve_newlines: keepNewlines,
        max_preserve_newlines: 2,
        end_with_newline: false,
      };
      return { text: lib[lang](deferred, opts), error: '' };
    } catch (e) {
      return { text: '', error: e instanceof Error ? e.message : 'Could not format this input.' };
    }
  }, [deferred, effectiveAction, lang, lib, indent, wrap, keepNewlines]);

  async function paste() {
    const t = await readClipboard();
    if (t !== null) setInput(t);
  }

  const inBytes = utf8Length(deferred);
  const outBytes = utf8Length(result.text);
  const ext = lang === 'js' ? 'js' : lang;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented<Lang>
          label="Language"
          value={lang}
          onChange={setLang}
          options={(Object.keys(LABELS) as Lang[]).map((l) => ({ value: l, label: LABELS[l] }))}
        />
        <Segmented<Action>
          label="Action"
          value={effectiveAction}
          onChange={setAction}
          options={[
            { value: 'beautify', label: 'Beautify' },
            ...(canMinify ? [{ value: 'minify' as Action, label: 'Minify' }] : []),
          ]}
        />
        {effectiveAction === 'beautify' ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted">
              Indent
              <Select value={indent} onChange={(e) => setIndent(e.target.value)} className="h-8 w-32" aria-label="Indent size">
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="tab">Tab</option>
              </Select>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              Wrap lines
              <Select value={wrap} onChange={(e) => setWrap(e.target.value)} className="h-8 w-32" aria-label="Wrap line length">
                <option value="0">Never</option>
                <option value="80">At 80</option>
                <option value="120">At 120</option>
              </Select>
            </label>
            <Toggle checked={keepNewlines} onChange={setKeepNewlines} label="Keep blank lines" />
          </>
        ) : null}
      </div>
      {!canMinify ? <p className="text-xs text-muted">JavaScript is beautify-only. Safe minification needs a full parser, so use a build tool such as esbuild or Terser.</p> : null}
      {shareError ? <Notice kind="error">{shareError}</Notice> : null}
      {loadError ? <Notice kind="error">{loadError}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Input"
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={paste}>
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Paste
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLES[lang])}>
                <FileCode className="h-3.5 w-3.5" aria-hidden /> Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput('')} disabled={!input}>
                <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
            </>
          }
        >
          <CodeArea ariaLabel={`${LABELS[lang]} input`} value={input} onChange={setInput} placeholder={`Paste ${LABELS[lang]} here`} />
        </Panel>
        <Panel
          title={effectiveAction === 'minify' ? 'Minified' : 'Beautified'}
          actions={
            <>
              <CopyButton text={result.text} disabled={!result.text} />
              <Button size="sm" onClick={() => downloadText(`formatted.${ext}`, result.text, 'text/plain')} disabled={!result.text}>
                <Download className="h-3.5 w-3.5" aria-hidden /> Download
              </Button>
              <ShareButton tool="html-formatter" getPayload={() => ({ lang, input })} disabled={!input.trim()} />
            </>
          }
        >
          <CodeArea ariaLabel="Formatted output" value={result.text} readOnly placeholder="The result appears here" />
        </Panel>
      </div>

      {result.error ? <Notice kind="error">{result.error}</Notice> : null}
      {result.text ? (
        <p className="text-sm text-muted" aria-live="polite">
          {formatBytes(inBytes)} in, {formatBytes(outBytes)} out
          {effectiveAction === 'minify' && inBytes > 0 ? ` (${Math.round((1 - outBytes / inBytes) * 100)}% smaller)` : ''}.
        </p>
      ) : null}
    </div>
  );
}
