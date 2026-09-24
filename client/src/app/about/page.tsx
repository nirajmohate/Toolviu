import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/StaticPage';
import { site } from '@/lib/site';
import { tools } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'About',
  description: `${site.name} is a collection of free developer tools that run in your browser with no account needed.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <StaticPage title={`About ${site.name}`} intro="Small, fast tools for the jobs developers repeat every day.">
      <p>
        {site.name} started with a simple annoyance: you need to format a blob of JSON or decode a token, and every site wants a login, a cookie wall or an installer first. So this site does the opposite. Open a page, paste your data and get a result.
      </p>
      <h2>How it works</h2>
      <p>
        Most tools run entirely in your browser using JavaScript. Your JSON, tokens, hashes and code are processed on your own device and are not sent to us. The exceptions are opt-in: the API tester can send requests through our server so they are not blocked by CORS, and share links save a copy of your input for a limited time so the link can be opened by someone else.
      </p>
      <h2>How we pay for it</h2>
      <p>
        The tools are free to use with no limits. The site is supported by unobtrusive advertising, which is only loaded if you accept cookies. If you decline, everything still works the same.
      </p>
      <h2>What is here today</h2>
      <ul>
        {tools.map((t) => (
          <li key={t.slug}>
            <Link href={`/tools/${t.slug}`}>{t.name}</Link>: {t.tagline}
          </li>
        ))}
      </ul>
      <p>
        Want something added? Use the <Link href="/contact">contact form</Link>.
      </p>
    </StaticPage>
  );
}
