'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { printJson, tryParse, SAMPLE_JSON } from '@/lib/json';
import { CopyButton } from './CopyButton';

/** A small live JSON formatter. It is the hero because it shows what the whole site does: paste, get a result. */
export function HeroDemo() {
  const [input, setInput] = useState(SAMPLE_JSON);

  const result = useMemo(() => {
    const parsed = tryParse(input);
    if (!parsed.ok) return { ok: false as const, text: '', message: `Line ${parsed.error.line}, column ${parsed.error.column}: ${parsed.error.message}` };
    return { ok: true as const, text: printJson(parsed.node, { indent: '  ' }), message: '' };
  }, [input]);

  return (
    <div className="panel overflow-hidden shadow-[0_1px_0_rgb(var(--line)),0_24px_48px_-24px_rgb(var(--ink)/0.25)]">
      <div className="flex items-center justify-between border-b border-line bg-sunken/60 px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </div>
        <Link href="/tools/json-formatter" className="text-xs font-medium text-accent underline-offset-2 hover:underline">
          Open the full JSON formatter
        </Link>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="min-w-0 border-b border-line md:border-b-0 md:border-r">
          <label htmlFor="hero-input" className="block border-b border-line px-3 py-1.5 text-xs font-medium text-muted">
            Try it: edit this JSON
          </label>
          <textarea
            id="hero-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="code scroll-thin block h-56 w-full resize-none bg-transparent p-3 text-ink outline-none focus-visible:bg-sunken/40 md:h-72"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between border-b border-line px-3 py-1">
            <span className="text-xs font-medium text-muted">Formatted result</span>
            <CopyButton text={result.text} size="sm" variant="ghost" disabled={!result.ok} />
          </div>
          {result.ok ? (
            <pre className="code scroll-thin h-56 overflow-auto p-3 md:h-72" aria-live="polite">
              {result.text}
            </pre>
          ) : (
            <p role="alert" className="h-56 overflow-auto p-3 text-sm text-danger md:h-72">
              {result.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
