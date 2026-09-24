import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';
import { ContactForm } from '@/components/ContactForm';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact and feedback',
  description: `Request a tool, report a bug or say hello to the ${site.name} team.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <StaticPage title="Contact and feedback" intro="Missing a tool you use every day? Found a bug? Tell us. Most new tools on this site started as a request.">
      <ContactForm />
      <p className="mt-6 max-w-[60ch] text-sm text-muted">
        You can also write to <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </StaticPage>
  );
}
