# Toolviu: free developer tools website

A complete MERN + Next.js + Tailwind project: 12 free developer tools, no login, no paid tiers, built to earn from ads and organic search traffic. "Toolviu" is a placeholder name; see [Rebranding](#rebranding).

## The 12 tools

| Requested | Extra (added for more search traffic) |
|---|---|
| JSON Formatter | Base64 Encoder / Decoder |
| JSON Validator (+ JSON Schema) | URL Encoder / Decoder (+ URL inspector) |
| JWT Decoder (+ HMAC verify) | UUID Generator (v4 and v7) |
| Regex Tester | Hash Generator (MD5, SHA-*, HMAC, files) |
| API Tester | Unix Timestamp Converter |
| CSS Generator (shadow, gradient, radius, glass) | |
| HTML Formatter (HTML, CSS, JS) | |

Every tool has its own SEO page (title, description, canonical URL, JSON-LD, FAQ, related tools, generated social image) and appears in `sitemap.xml`.

## How it is built

```
client/   Next.js 15 (App Router) + React 19 + Tailwind 3, TypeScript
server/   Express 5 + Mongoose 8 (MongoDB), plain ESM JavaScript
```

- **Almost everything runs in the visitor's browser.** JSON, JWT, regex, CSS, HTML, Base64, URL, UUID, hash and timestamp tools never send data to your server. This makes the site cheap to run and is a real selling point for developers.
- **The Express API does four things:**
  1. `POST /api/proxy`: the API Tester's Proxy mode (sends the request from your server so browser CORS rules do not block it). Hardened against SSRF (see [Security](#security-notes)).
  2. `POST /api/share`, `GET /api/share/:id`: short share links for tool state, auto-deleted after 30 days (MongoDB TTL index).
  3. `POST /api/stats/view`, `GET /api/stats/popular`: anonymous per-tool daily view counters (no cookies, IPs or identifiers) that power the "Popular" badges.
  4. `POST /api/feedback`: the contact form, with a honeypot field and rate limiting.
- **Next.js rewrites `/api/*` to the Express API**, so the browser only ever talks to your domain.
- The site works when MongoDB is down: only share links, stats and the contact form return `503`.

## Quick start (development)

Requirements: Node.js 20+ and MongoDB (local, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. install
npm run install:all          # or: npm --prefix server install && npm --prefix client install

# 2. configure
cp server/.env.example server/.env      # set MONGODB_URI
cp client/.env.example client/.env.local

# 3. run (two terminals)
npm run dev:server           # API on http://localhost:5000
npm run dev:client           # site on http://localhost:3000
```

Quick MongoDB with Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`

Other scripts: `npm run build` (production build), `npm test` (server tests + client typecheck).

## Docker (one command)

```bash
cp .env.example .env         # set SITE_URL, SITE_NAME, CONTACT_EMAIL, ...
docker compose up -d --build
```

This starts MongoDB, the API and the website (port 3000). Put a reverse proxy with HTTPS in front (Caddy is the easiest: `your-domain.com { reverse_proxy localhost:3000 }`).

> **Important:** `SITE_URL` (or `CORS_ORIGINS` when not using compose) must be your exact public URL. Browsers attach an `Origin` header to POST requests and the API rejects origins that are not listed, so a wrong value breaks the API Tester, share links and the contact form while everything else looks fine.
>
> `NEXT_PUBLIC_*` values and `API_URL` are baked in at **build time**. Change them, then rebuild.

## Configuration

Client (`client/.env.local`, see `client/.env.example`): `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `API_URL`, AdSense and Google Analytics ids, Search Console verification.

Server (`server/.env`, see `server/.env.example`): `MONGODB_URI`, `CORS_ORIGINS`, `TRUST_PROXY`, share-link and proxy limits, rate limits.

**`TRUST_PROXY`** is the number of proxies in front of the API and decides which client IP the rate limiter sees. Website exposed directly: `1` (Next.js is the only proxy). Behind Caddy/nginx/a platform proxy plus Next.js: `2`. Too low makes all visitors share one rate-limit bucket; too high lets visitors spoof their IP.

## Deploying

**Option A, single VPS (simplest, about $5 to $6 per month):** Docker Compose as above + Caddy for HTTPS. Set `TRUST_PROXY=2`.

**Option B, split hosting:**
- Website: Vercel or any Node host (`client/`). Set `API_URL` to your API's URL *at build time*.
- API: Render, Railway, Fly.io or a VPS (`server/`, `npm start`, or use `server/Dockerfile`). Set `CORS_ORIGINS` to your site URL and `TRUST_PROXY` (usually `2`).
- Database: MongoDB Atlas free tier.

Health check for uptime monitors: `GET /api/health`.

## Making money

The site is ready for **Google AdSense**, and works without it:

1. Deploy on your own domain with HTTPS and get the site indexed (below).
2. Apply to AdSense with the domain. It needs the About, Contact, Privacy and Terms pages, which are included. Approval is at Google's discretion and generally wants a site that is live, has real content, and has some organic traffic. Approval is not guaranteed.
3. When approved, put your publisher id in `NEXT_PUBLIC_ADSENSE_CLIENT`, create two display ad units and set `NEXT_PUBLIC_ADSENSE_SLOT_TOP` and `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM`, then rebuild. Put the line AdSense gives you in `client/public/ads.txt`.
4. Ads and Google Analytics load **only after the visitor accepts** the cookie banner; declining leaves every tool fully working. If you have visitors in the EEA, UK or Switzerland, Google requires a certified consent management platform for personalised ads. Enable Google's own "Privacy & messaging" in AdSense.

Traffic comes from search. Realistic steps that help: submit `https://your-domain/sitemap.xml` in Google Search Console, keep adding tools people search for (each tool page is a keyword-targeted landing page), and improve the copy on tool pages over time. Nothing here can promise a traffic or revenue level.

## Rebranding

1. Set `NEXT_PUBLIC_SITE_NAME` (and `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`). The name is used in the header, footer, titles, structured data, social images, manifest and legal pages.
2. Replace `client/src/app/icon.svg` and the `LogoMark` in `client/src/components/Logo.tsx` with your logo.
3. Accent colour and theme: the CSS variables at the top of `client/src/app/globals.css`.

## Adding a tool

1. Add an entry to `client/src/lib/tools.ts` (name, SEO text, steps, FAQ, related tools).
2. Create `client/src/components/tools/YourTool.tsx` (default export) and register it in `registry.tsx`.
3. Add the slug to `server/src/utils/tools.js` so view counters work (and to `SHAREABLE_TOOLS` if it should have share links).

Routing, metadata, sitemap, structured data and social images are generated automatically.

## Security notes

- **SSRF protection on the API proxy.** Only `http(s)` URLs to *public* addresses are allowed. Loopback, private, link-local (including cloud metadata `169.254.169.254`), CGNAT, multicast and reserved ranges are blocked, including obfuscated forms (`2130706433`, `0x7f000001`, IPv4-mapped IPv6). Every redirect hop is re-validated, and the DNS answer is checked at socket-connect time to defeat DNS rebinding. Also enforced: 15 s timeout, 2 MB response cap, header sanitising (no CRLF injection, no `Host`/`X-Forwarded-*` spoofing), credentials dropped on cross-origin redirects, and per-IP rate limiting (30 requests/min).
- Because the proxy makes requests on behalf of anonymous visitors, it can be abused as a way to send traffic at third parties. The rate limit, size cap and timeout bound that; watch your logs, and lower `RATE_PROXY_PER_MIN` if needed.
- Share links are readable by anyone with the link. The JWT, API tester and hash tools deliberately have no share button.
- The app sets standard security headers (HSTS, `X-Content-Type-Options`, frame and referrer policy). A strict Content-Security-Policy is intentionally not included because AdSense and Analytics need broad script/frame permissions; add one if you do not use them.

## What was tested, and what was not

Verified in the build environment:
- Server: 31 automated tests pass (`cd server && npm test`): SSRF address classification including obfuscated IPs, proxy behaviour (redirects, loops, gzip, size cap, timeout, binary bodies, header handling, blocked targets) against a local test server, and API-level behaviour (validation, security headers, CORS, DB-down responses, honeypot). The proxy was also run against real HTTPS hosts.
- Client: TypeScript typecheck and `next build` pass (37 pages generated); both packages report 0 npm audit vulnerabilities.
- The built site and API were run together: pages render, `/api` rewrites to the API, the proxy works end to end, and SSRF attempts return 403.
- The custom JSON parser was checked against the native parser on a battery of valid and invalid inputs (and against `JSON.stringify` output). Time-zone/DST conversion, UUID v4/v7, Base64, the HTML/CSS minifiers, the regex worker logic and MD5/HMAC output were checked in Node. The JWT sample token signature was checked against Node's `crypto`.

**Not verified here, so please check before launching:**
- **No real-browser testing.** The sandbox had no browser, so tool interactions (typing, clicking, layout at different screen sizes, dark mode appearance, cookie banner) were not exercised visually. Click through every tool once.
- **MongoDB-backed routes** (share links, view counters, feedback) were only tested with the database offline (correct 503s). Run them once against a real MongoDB.
- **Docker files** were written but not built (Docker was unavailable).
- **AdSense/Analytics** loading was not tested (needs real ids).

## Legal

The Privacy Policy and Terms of Use are sensible starting templates that describe what this code actually does. They are not legal advice. Have them reviewed for your jurisdiction and update them if you add features, analytics or ad networks.
