import Link from 'next/link';
import { ShieldCheck, UserX, Zap } from 'lucide-react';
import { site } from '@/lib/site';
import { toolMap, tools } from '@/lib/tools';
import { HeroDemo } from '@/components/HeroDemo';
import { ToolDirectory } from '@/components/ToolDirectory';
import { AdSlot } from '@/components/Consent';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 300;

async function getPopular(): Promise<string[]> {
  try {
    const base = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const res = await fetch(`${base}/api/stats/popular?limit=6`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const json = (await res.json()) as { tools?: { tool: string }[] };
    return (json.tools ?? []).map((t) => t.tool).filter((slug) => slug in toolMap);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const popular = await getPopular();

  return (
    <>
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url, description: site.description },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${site.name} developer tools`,
            itemListElement: tools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site.url}/tools/${t.slug}`, name: t.name })),
          },
        ]}
      />

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-shell items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[5fr_7fr] lg:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.4rem]">Format, decode and test without making an account</h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-8 text-muted">
              {tools.length} free developer tools in one place. They run in your browser, so what you paste stays on your device.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#tools" className="btn btn-primary h-11 px-5 text-base">
                Browse all tools
              </Link>
              <Link href="/tools/api-tester" className="btn btn-secondary h-11 px-5 text-base">
                Try the API tester
              </Link>
            </div>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-shell scroll-mt-16 px-4 py-16 sm:px-6">
        <h2 className="mb-6 text-3xl font-bold">All tools</h2>
        <ToolDirectory popular={popular} />
      </section>

      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <AdSlot slot={site.adsenseSlotBottom} />
      </div>

      <section className="mx-auto max-w-shell px-4 pb-4 pt-8 sm:px-6">
        <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Your data stays put', text: 'Formatting, decoding, hashing and testing all happen inside your browser tab. Nothing is uploaded unless you choose to share a link.' },
            { icon: UserX, title: 'No account, ever', text: 'There is nothing to sign up for and no limit on how often you use a tool. Open a page and start working.' },
            { icon: Zap, title: 'Built to be fast', text: 'Pages are small and tools load on demand, so they are ready when you are, even on a slow connection.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="h-6 w-6 text-accent" aria-hidden />
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 max-w-[42ch] leading-7 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
