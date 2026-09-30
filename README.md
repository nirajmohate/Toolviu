# Toolviu: free developer tools website

A 100% client-side project: 12 free developer tools, no login, no paid tiers, **no backend, no database**. "Toolviu" is a placeholder name; see [Rebranding](#rebranding).

## The 12 tools

| Category | Tools |
|---|---|
| Format & validate | JSON Formatter, JSON Validator (+ JSON Schema), HTML/CSS/JS Formatter |
| Decode | JWT Decoder (+ HMAC verify), Base64 Encoder/Decoder, URL Encoder/Decoder, Unix Timestamp Converter |
| Test | Regex Tester, API Tester |
| Generate | CSS Generator (shadow, gradient, radius, glass), UUID Generator (v4/v7), Hash Generator (MD5, SHA-*, HMAC) |

Every tool has its own SEO page (title, description, canonical URL, JSON-LD, FAQ, related tools, generated social image) and appears in `sitemap.xml`.

## How it is built

```
client/   Next.js 15 (App Router) + React 19 + Tailwind 3, TypeScript
```

That's the whole project. **Every one of the 12 tools runs entirely in the visitor's browser** — JSON, JWT, regex, CSS, HTML, Base64, URL, UUID, hash and timestamp. Nothing is ever uploaded anywhere.

The **API Tester** sends requests straight from the visitor's own browser using the standard `fetch` API. This means:
- It can reach `localhost` and other addresses on the visitor's own network — genuinely useful for testing an API you're developing.
- Requests to public APIs that allow cross-origin calls (most do) work normally.
- Some APIs that don't set permissive CORS headers will show a CORS error. That's a restriction enforced by the browser for security and can only be fixed by the API's own server — not something this site can work around without adding a backend.

There is intentionally no server of any kind. No Express, no MongoDB, no proxy, no share links, no view counters, no server-stored contact form. This keeps hosting free and permanent (no server to sleep, crash, or run out of free-tier hours) and removes an entire category of things that can break.

## Quick start (development)

Requirements: Node.js 20+.

```bash
cd client
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Deploying for free, on Vercel

No domain and no budget needed — Vercel's free tier gives you a permanent HTTPS URL (`your-app.vercel.app`).

### The one setting to get right

This repo has the actual Next.js app inside a `client/` subfolder, not at the repository root. When you import the repo into Vercel:

**Project Settings -> General -> Root Directory -> set to `client`**

If you skip this, Vercel won't find the app and every page will 404, even though the deployment appears to "succeed."

### Step-by-step

1. Push this repo to GitHub.
2. In Vercel: **Add New -> Project** -> import the repo.
3. Before the first deploy, set **Root Directory** to `client` (or fix it in Settings afterward and redeploy).
4. Set these environment variables in Vercel's dashboard:
   ```
   NEXT_PUBLIC_SITE_NAME=Toolviu
   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   NEXT_PUBLIC_CONTACT_EMAIL=you@example.com
   ```
   (You'll only know your exact `.vercel.app` URL after the project is created — Vercel shows it immediately, before the build even finishes. Copy it in, then deploy or redeploy.)
5. Leave the AdSense/GA/verification variables blank until you have real values (see [Monetisation](#monetisation)).

`NEXT_PUBLIC_*` variables are baked into the site at build time, so changing one always requires a redeploy (Vercel -> Deployments -> ... -> Redeploy) — this is expected, not a bug.

### Moving to a real domain later

Buy a domain, add it under the Vercel project's Domains tab (Vercel walks you through the DNS records), then update `NEXT_PUBLIC_SITE_URL` to the new domain and redeploy. No other code changes needed.

## Rebranding

1. Set `NEXT_PUBLIC_SITE_NAME` (and `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`).
2. Replace `client/src/app/icon.svg` and the `LogoMark` in `client/src/components/Logo.tsx` with your logo.
3. Accent colour and theme: the CSS variables at the top of `client/src/app/globals.css`.

## Adding a tool

1. Add an entry to `client/src/lib/tools.ts` (name, SEO text, steps, FAQ, related tools).
2. Create `client/src/components/tools/YourTool.tsx` (default export) and register it in `registry.tsx`.

Routing, metadata, sitemap, structured data and social images are generated automatically.

## Monetisation

The site is ready for **Google AdSense**, and works fully without it:

1. Get the site live on a real domain with real traffic.
2. Apply at google.com/adsense. It expects the About, Privacy and Terms pages, which are included.
3. When approved, set `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_TOP`, `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM` and put the line AdSense gives you into `client/public/ads.txt`, then redeploy.
4. Ads (and Google Analytics, if you set `NEXT_PUBLIC_GA_ID`) only load after a visitor accepts the cookie banner; declining leaves every tool fully working.

Submit `https://your-domain/sitemap.xml` to Google Search Console early — it's free and separate from AdSense.

## Why there's no contact form

Since there's no backend to receive submissions, the Contact link in the header/footer is a plain `mailto:` link to `NEXT_PUBLIC_CONTACT_EMAIL`. If you'd like a real in-page contact form later, that would need a small backend (or a third-party form service like Formspree) — ask if you want that added.

## What was tested, and what was not

Verified in the build environment: the app typechecks cleanly and `next build` succeeds, producing static/SSG pages for every tool. `npm audit` reports 0 vulnerabilities. The custom JSON parser, time-zone/DST conversion, UUID v4/v7, Base64, the HTML/CSS minifiers, the regex worker logic and MD5/HMAC output were all checked against Node's built-ins during development.

**Not verified here:** real-browser testing (this environment has no browser — click through every tool once after deploying) and the actual live Vercel deployment (the Root Directory setting can't be tested from this environment — see the deployment section above for the exact step).

## Legal

The Privacy Policy and Terms of Use are sensible starting templates describing what this code actually does. They are not legal advice — have them reviewed for your jurisdiction before relying on them.
