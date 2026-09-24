'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { setConsent, useConsent } from '@/lib/consent';
import { hasTracking, site } from '@/lib/site';
import { Button } from './ui';

/** Banner is only shown when ads or analytics are configured. */
export function ConsentBanner() {
  const consent = useConsent();
  if (!hasTracking || consent !== 'none') return null;
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-lg border border-line bg-surface p-4 shadow-lg sm:inset-x-6">
      <p className="text-sm leading-6 text-ink/90">
        {site.name} is free because of ads and basic analytics. These use cookies. Accept to help keep the tools free, or decline and the tools work exactly the same.{' '}
        <Link className="text-accent underline underline-offset-2" href="/privacy">
          Privacy policy
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setConsent('granted')}>
          Accept
        </Button>
        <Button onClick={() => setConsent('denied')}>Decline</Button>
      </div>
    </div>
  );
}

export function CookieSettingsLink() {
  if (!hasTracking) return null;
  return (
    <button type="button" onClick={() => setConsent('none')} className="text-muted transition-colors hover:text-ink">
      Cookie settings
    </button>
  );
}

/** Third-party scripts load ONLY after the visitor accepts. */
export function ThirdPartyScripts() {
  const consent = useConsent();
  if (consent !== 'granted') return null;
  return (
    <>
      {site.adsenseClient ? (
        <Script
          id="adsense"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}`}
          crossOrigin="anonymous"
        />
      ) : null}
      {site.gaId ? (
        <>
          <Script id="ga-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${site.gaId}`} />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${site.gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
    </>
  );
}

export function AdSlot({ slot, className }: { slot: string; className?: string }) {
  const consent = useConsent();
  const pushed = useRef(false);

  useEffect(() => {
    if (consent !== 'granted' || !site.adsenseClient || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers etc. */
    }
  }, [consent, slot]);

  if (!site.adsenseClient || !slot) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`flex h-24 items-center justify-center rounded-md border border-dashed border-line text-xs text-muted ${className || ''}`}>
          Ad slot (visible in development only). Set NEXT_PUBLIC_ADSENSE_CLIENT and slot ids in .env
        </div>
      );
    }
    return null;
  }
  if (consent !== 'granted') return null;

  return (
    <div className={`overflow-hidden ${className || ''}`} aria-label="Advertisement">
      <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={site.adsenseClient} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
