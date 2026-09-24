import type { ReactNode } from 'react';

export function StaticPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-shell px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
      {intro ? <p className="mt-4 max-w-[60ch] text-lg leading-8 text-muted">{intro}</p> : null}
      <div className="prose-tool mt-8">{children}</div>
    </div>
  );
}
