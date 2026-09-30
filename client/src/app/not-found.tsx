import Link from 'next/link';
import { tools } from '@/lib/tools';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-shell px-4 py-24 sm:px-6">
      <h1 className="text-4xl font-bold">That page does not exist</h1>
      <p className="mt-3 max-w-prose text-muted">The link may be old, or the address may have a typo. Here are some tools you might be looking for.</p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link className="block rounded-md border border-line bg-surface px-4 py-3 text-sm font-medium hover:bg-sunken" href={`/tools/${t.slug}`}>
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
