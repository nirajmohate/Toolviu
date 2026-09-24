import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: `The rules for using ${site.name} and its free developer tools.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <StaticPage title="Terms of use" intro={`Last updated ${site.lastUpdated}.`}>
      <h2>Using the tools</h2>
      <p>
        {site.name} is free to use for personal and commercial work. You are responsible for the data you process and for making sure you have the right to use it.
      </p>
      <h2>No warranty</h2>
      <p>
        The tools are provided &ldquo;as is&rdquo; without warranty of any kind. We work to make them accurate, but you should verify results before relying on them, especially for security, financial or production decisions. To the extent permitted by law, we are not liable for any loss arising from use of the tools.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use the API tester to attack, scan, overload or harass any system, or to access systems you are not authorised to test.</li>
        <li>Do not attempt to bypass rate limits or security controls.</li>
        <li>Do not use share links to store or distribute illegal, infringing or malicious content. We may remove any content at any time.</li>
      </ul>
      <p>We may block access for anyone who abuses the service.</p>
      <h2>Share links</h2>
      <p>Shared content is stored for a limited period and may be deleted earlier. Anyone who has the link can read the content. Do not share secrets, credentials or personal data.</p>
      <h2>Changes</h2>
      <p>We may update these terms and the tools from time to time. Continued use means you accept the updated terms.</p>
      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </StaticPage>
  );
}
