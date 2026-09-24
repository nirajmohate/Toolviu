'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { categories, tools, type CategoryId, type Tool } from '@/lib/tools';
import { ToolIcon } from './ToolIcon';

function matches(tool: Tool, q: string): boolean {
  const hay = `${tool.name} ${tool.tagline} ${tool.keywords.join(' ')}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

function Row({ tool, popular }: { tool: Tool; popular: boolean }) {
  return (
    <li>
      <Link
        href={`/tools/${tool.slug}`}
        className="group flex items-start gap-3.5 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-line hover:bg-surface"
      >
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <ToolIcon name={tool.icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-medium">
            {tool.name}
            {popular ? <span className="rounded bg-mark/60 px-1.5 py-0.5 text-[11px] font-medium text-[#3b2f00] dark:text-mark dark:bg-mark/15">Popular</span> : null}
          </span>
          <span className="mt-0.5 block text-sm leading-5 text-muted">{tool.tagline}</span>
        </span>
      </Link>
    </li>
  );
}

export function ToolDirectory({ popular }: { popular: string[] }) {
  const [q, setQ] = useState('');
  const popularSet = useMemo(() => new Set(popular.slice(0, 3)), [popular]);
  const filtered = useMemo(() => tools.filter((t) => matches(t, q)), [q]);

  return (
    <div>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools, for example jwt, json, hash"
          aria-label="Search tools"
          className="input h-11 pl-9 text-base"
        />
      </div>

      {q.trim() ? (
        filtered.length ? (
          <ul className="mt-6 grid gap-x-8 gap-y-1 md:grid-cols-2">
            {filtered.map((t) => (
              <Row key={t.slug} tool={t} popular={popularSet.has(t.slug)} />
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-muted">
            No tool matches &ldquo;{q}&rdquo;. Try another word, or{' '}
            <Link className="text-accent underline underline-offset-2" href="/contact">
              tell us which tool you need
            </Link>
            .
          </p>
        )
      ) : (
        <div className="mt-10 space-y-10">
          {(Object.keys(categories) as CategoryId[]).map((id) => {
            const list = tools.filter((t) => t.category === id);
            if (!list.length) return null;
            return (
              <section key={id} aria-labelledby={`cat-${id}`}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2">
                  <h3 id={`cat-${id}`} className="text-xl font-semibold">
                    {categories[id].name}
                  </h3>
                  <p className="text-sm text-muted">{categories[id].blurb}</p>
                </div>
                <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                  {list.map((t) => (
                    <Row key={t.slug} tool={t} popular={popularSet.has(t.slug)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
