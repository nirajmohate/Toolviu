import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/StaticPage';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `How ${site.name} handles your data: what stays in your browser, what we store, and how cookies are used.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy policy" intro={`Last updated ${site.lastUpdated}. The short version: your input stays in your browser unless you explicitly share it.`}>
      <h2>What runs on your device</h2>
      <p>
        The JSON, JWT, regex, CSS, HTML, Base64, URL, UUID, hash and timestamp tools process your input locally in your browser. We do not receive or store what you type into them.
      </p>

      <h2>What we do store</h2>
      <ul>
        <li>
          <strong>Share links.</strong> If you press &ldquo;Share link&rdquo;, the content of that tool is saved on our server so the link can be opened by others. It is deleted automatically after 30 days. Do not share secrets.
        </li>
        <li>
          <strong>Feedback.</strong> If you send a message through the contact form, we store the message, the optional email address you provide and your browser type, so we can respond and fix problems.
        </li>
        <li>
          <strong>Anonymous usage counts.</strong> When you open a tool we increase a counter for that tool for the day. It contains no cookie, identifier or IP address.
        </li>
      </ul>

      <h2>The API tester</h2>
      <p>
        In Proxy mode, the request you build (URL, headers and body) is sent to our server, which forwards it to the target and returns the response to you. Requests and responses are not saved. Like most servers, ours may keep standard access logs (time, path and IP address) for a short period for security and abuse prevention. Avoid sending credentials you are not comfortable passing through a third-party server; use Browser mode instead.
      </p>

      <h2>Cookies, advertising and analytics</h2>
      <p>
        With your consent, we load Google AdSense to show ads and, if enabled, Google Analytics to measure traffic. These services may set cookies and process data such as your IP address and browsing behaviour under their own policies. If you decline, they are not loaded. You can change your choice at any time with &ldquo;Cookie settings&rdquo; in the footer.
      </p>

      <h2>Local storage</h2>
      <p>
        Your browser&rsquo;s local storage is used for your theme preference, your cookie choice and (in the API tester) your recent request history. This data never leaves your device and you can clear it in your browser settings.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us to delete a share link or a message you sent, and to tell you what data we hold about you. Contact us at <a href={`mailto:${site.email}`}>{site.email}</a> or through the <Link href="/contact">contact form</Link>.
      </p>
    </StaticPage>
  );
}
