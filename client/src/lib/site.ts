// Single source of truth for branding. Change NEXT_PUBLIC_SITE_NAME in .env to rebrand.
// NOTE: NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them.
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Toolviu',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  tagline: 'Free online developer tools',
  description:
    'Free online developer tools: JSON formatter, JWT decoder, regex tester, API tester, CSS generator and more. No login, no ads walls, and your data stays in your browser.',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@example.com',
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '',
  adsenseSlotTop: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP || '',
  adsenseSlotBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '',
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  lastUpdated: 'September 2026',
} as const;

export const hasTracking = Boolean(site.adsenseClient || site.gaId);
