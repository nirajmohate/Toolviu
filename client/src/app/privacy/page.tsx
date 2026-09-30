import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `How ${site.name} handles your data: what stays in your browser and how cookies are used.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy policy" intro={`Last updated ${site.lastUpdated}. The short version: your input stays in your browser.`}>
      <h2>What runs on your device</h2>
      <p>
        Every tool on this site &mdash; JSON, JWT, regex, CSS, HTML, Base64, URL, UUID, hash and timestamp &mdash; processes your input locally in your browser. We do not receive or store what you type into any of them.
      </p>

      <h2>The API tester</h2>
      <p>
        Requests you build in the API tester are sent directly from your browser to the address you specify. They never pass through any server of ours, are never logged, and are never stored anywhere.
      </p>

      <h2>Cookies, advertising and analytics</h2>
      <p>
        With your consent, we load Google AdSense to show ads and, if enabled, Google Analytics to measure traffic. These services may set cookies and process data such as your IP address and browsing behaviour under their own policies. If you decline, they are not loaded. You can change your choice at any time with &ldquo;Cookie settings&rdquo; in the footer.
      </p>

      <h2>Local storage</h2>
      <p>
        Your browser&rsquo;s local storage is used for your theme preference, your cookie choice and (in the API tester) your recent request history. This data never leaves your device and you can clear it in your browser settings.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </StaticPage>
  );
}
