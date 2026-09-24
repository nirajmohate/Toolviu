'use client';

import { useMemo, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Textarea with a line-number gutter. Used for both editable inputs and read-only output.
 * Keeps things dependency-free and fast (no heavy editor bundle).
 */
export function CodeArea({
  value,
  onChange,
  readOnly = false,
  placeholder,
  errorLine,
  className,
  ariaLabel,
  wrap = false,
  id,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  errorLine?: number | null;
  className?: string;
  ariaLabel: string;
  wrap?: boolean;
  id?: string;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => (value.match(/\n/g)?.length ?? 0) + 1, [value]);
  const gutter = useMemo(() => {
    if (lineCount > 4000) return null;
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  return (
    <div className={cn('flex h-72 min-h-[12rem] overflow-hidden rounded-b-lg bg-surface focus-within:ring-2 focus-within:ring-inset focus-within:ring-accent/40 md:h-[26rem]', className)}>
      <div
        ref={gutterRef}
        aria-hidden
        className="code select-none overflow-hidden border-r border-line bg-sunken/60 py-3 pl-2 pr-2 text-right text-muted/70"
        style={{ minWidth: `${Math.max(String(lineCount).length, 2) + 1.2}ch` }}
      >
        {gutter ? (
          gutter.map((n) => (
            <div key={n} className={n === errorLine ? 'font-bold text-danger' : undefined}>
              {n}
            </div>
          ))
        ) : (
          <div className="whitespace-pre">{Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}</div>
        )}
      </div>
      <textarea
        id={id}
        aria-label={ariaLabel}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap={wrap ? 'soft' : 'off'}
        className={cn(
          'code scroll-thin h-full min-w-0 flex-1 resize-none border-0 bg-transparent p-3 text-ink outline-none placeholder:text-muted/60 focus-visible:outline-none',
          wrap ? 'whitespace-pre-wrap' : 'whitespace-pre',
        )}
      />
    </div>
  );
}
