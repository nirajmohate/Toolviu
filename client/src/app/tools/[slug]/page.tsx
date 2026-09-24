import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Lock } from 'lucide-react';
import { getTool, tools } from '@/lib/tools';
import { site } from '@/lib/site';
import { toolComponents } from '@/components/tools/registry';
import { JsonLd } from '@/components/JsonLd';
import { AdSlot } from '@/components/Consent';
import { TrackView } from '@/components/TrackView';
import { ToolIcon } from '@/components/ToolIcon';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const url = `/tools/${tool.slug}`;
  return {
    title: tool.seoTitle,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${tool.seoTitle} | ${site.name}`, description: tool.description, siteName: site.name },
    twitter: { card: 'summary_large_image', title: tool.seoTitle, description: tool.description },
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = getTool(slug);
  const Tool = toolComponents[slug];
  if (!tool || !Tool) notFound();

  const url = `${site.url}/tools/${tool.slug}`;
  const related = tool.related.map((s) => getTool(s)).filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: tool.name,
            url,
            description: tool.description,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Any (web browser)',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: tool.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: site.url },
              { '@type': 'ListItem', position: 2, name: tool.name, item: url },
            ],
          },
        ]}
      />
      <TrackView tool={tool.slug} />

      <div className="mx-auto max-w-shell px-4 pb-6 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href="/#tools" className="hover:text-ink">
            Tools
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span aria-current="page" className="text-ink">
            {tool.name}
          </span>
        </nav>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:flex">
              <ToolIcon name={tool.icon} className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">{tool.name}</h1>
              <p className="mt-1.5 max-w-[60ch] text-muted">{tool.tagline}</p>
            </div>
          </div>
          {slug === 'api-tester' ? null : (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
              <Lock className="h-3.5 w-3.5 text-ok" aria-hidden /> Runs in your browser
            </p>
          )}
        </header>

        <AdSlot slot={site.adsenseSlotTop} className="mb-5" />

        <Tool />

        <AdSlot slot={site.adsenseSlotBottom} className="mt-8" />

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="prose-tool">
            <h2 className="!mt-0">About this tool</h2>
            <p>{tool.intro}</p>

            <h2>How to use it</h2>
            <ol className="mb-4 max-w-[68ch] list-decimal space-y-2 pl-5 text-ink/85">
              {tool.steps.map((s) => (
                <li key={s} className="pl-1 leading-7">
                  {s}
                </li>
              ))}
            </ol>

            <h2>Frequently asked questions</h2>
            <div className="max-w-[68ch] divide-y divide-line rounded-lg border border-line bg-surface">
              {tool.faq.map((f) => (
                <details key={f.q} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" aria-hidden />
                  </summary>
                  <p className="!mb-0 mt-2 text-sm leading-6 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </article>

          <aside aria-label="Related tools">
            <h2 className="mb-3 font-sans text-sm font-semibold tracking-normal">Related tools</h2>
            <ul className="space-y-1">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/tools/${r.slug}`} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface">
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-accent/10 text-accent">
                      <ToolIcon name={r.icon} className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{r.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
