import Link from 'next/link';
import { Logo } from './Logo';
import { tools } from '@/lib/tools';
import { site } from '@/lib/site';
import { CookieSettingsLink } from './Consent';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_2fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
            Free developer tools that run in your browser. No account, no install, and your data stays with you.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold tracking-normal">Tools</h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link href={`/tools/${t.slug}`} className="text-muted transition-colors hover:text-ink">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold tracking-normal">{site.name}</h2>
          <ul className="space-y-2 text-sm">
            {[
              ['/about', 'About'],
              ['/contact', 'Contact and feedback'],
              ['/privacy', 'Privacy policy'],
              ['/terms', 'Terms of use'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-muted transition-colors hover:text-ink">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsLink />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-shell px-4 py-5 text-xs text-muted sm:px-6">
          &copy; {new Date().getFullYear()} {site.name}. All tools are provided as is, without warranty.
        </p>
      </div>
    </footer>
  );
}
