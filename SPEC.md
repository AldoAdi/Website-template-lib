# Spec: Website Template Library (`@aldoadi/website-template`)

Repo: https://github.com/AldoAdi/Website-template-lib.git
Status: Draft v2 — awaiting approval
Date: 2026-09-06

---

## Assumptions

Correct these now or they get built:

1. Every consuming site is **Next.js 16 App Router + React 19 + TypeScript**. Non-Next consumers are out of scope.
2. Consumers install by **git URL, pinned to a tag**: `npm i github:AldoAdi/Website-template-lib#v1.0.0`.
3. The library ships **TypeScript source, not a build**. Consumers add one line to `next.config.ts`:
   ```ts
   transpilePackages: ['@aldoadi/website-template']
   ```
   Next compiles it. No `dist/`, no `prepare` script, no publish pipeline.
   <!-- ponytail: no build step. Add tsup/rollup only when a non-Next consumer appears. -->
4. **Everything in the library must work under `output: 'export'`** (static). Most sites deploy to Vercel; prototypes deploy to GitHub Pages. Static is the floor — nothing in the library may require a Node server, route handler, or middleware.
5. **Tailwind v4** (CSS-first `@theme`). No `tailwind.config.js` preset — the library ships a CSS file of custom properties.
6. **Two-layer theming.** Palette and scale live in CSS custom properties (build-time, per site). Light/dark swap is runtime via `next-themes` class toggling. No `setColors()` JS API.
7. **No Firebase in v1.** GA4 on a website needs no Firebase SDK. Module is planned, not built.
8. Each site owns its own `/public` assets, `.env.local`, and content. The library ships **zero images**.
9. Single maintainer (you). No RFC process, no changelog automation beyond git tags.

---

## Objective

One versioned library holding everything identical across many small websites, so a new site is: clone the starter, `npm i` the lib, override theme vars, drop in assets, write content. Shared logic is fixed once, in one place; each site upgrades by bumping a git tag.

**User:** you, building N marketing/content sites.

**Success looks like:** site #2 onward reuses ≥80% of its non-content code from the library, and a security or analytics fix lands in every site by bumping one dependency line.

### Deliverables

| Repo                       | Purpose                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Website-template-lib`     | This spec. The shared library.                                                                                                                                      |
| `Website-template-starter` | Thin Next.js skeleton to clone per new site. Wires the lib, holds `theme.css`, `/public`, content, deploy config, and one working sample page. No logic of its own. |

### The sample page

The starter ships one real single-page marketing site. It is the definition of v1 scope — the library builds exactly what this page needs, nothing more.

```
Header        logo slot, nav links, ThemeToggle
Hero          headline, subhead, primary CTA
FeatureGrid   3 × Card (icon slot, title, body)
CTA           band with a single action
ContactForm   name / email / message → Web3Forms, zod-validated, honeypot
Footer        links, copyright, social slots
CookieBanner  fixed, blocks GA until accepted
```

Plus, non-visual: `<GoogleAnalytics>`, `<ThemeProvider>`, SEO metadata, JSON-LD `Organization` + `WebSite`, sitemap, robots, security headers.

This page is also the visual regression surface — it is what gets rendered on both deploy targets to prove the library works.

---

## Deploy Targets

Both must work from the same library code.

|                  | Vercel (default)                                | GitHub Pages (prototypes)                                                          |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Mode             | Node server, SSR + ISR                          | `output: 'export'`, static only                                                    |
| Security headers | Real HTTP headers via `next.config` `headers()` | `<meta http-equiv="Content-Security-Policy">` only — no `frame-ancestors`, no HSTS |
| Images           | `next/image` optimized                          | `images: { unoptimized: true }`                                                    |
| Paths            | root                                            | `basePath` + `assetPrefix` = `/<repo>`, `trailingSlash: true`                      |
| Forms            | third-party endpoint                            | third-party endpoint (same)                                                        |

Library exports one helper so a site picks a target with one line:

```ts
// next.config.ts (consumer)
import { defineNextConfig } from '@aldoadi/website-template/config'

export default defineNextConfig({
  target: process.env.DEPLOY_TARGET === 'github-pages' ? 'github-pages' : 'vercel',
  repoName: 'my-site', // only used by github-pages
})
```

> GitHub Pages CSP is genuinely weaker than Vercel's. Prototypes only — don't ship anything real there.

---

## Tech Stack

Versions verified against npm on 2026-09-06. All are current `latest`.

| Concern           | Package                  | Version                          |
| ----------------- | ------------------------ | -------------------------------- |
| Framework (peer)  | `next`                   | `^16.3.4`                        |
| UI (peer)         | `react`, `react-dom`     | `^19.2.8`                        |
| Language (dev)    | `typescript`             | `~6.0.3` — **not 7.x**, see note |
| Styling (peer)    | `tailwindcss`            | `^4.3.3`                         |
| Analytics loader  | `@next/third-parties`    | `^16.3.4`                        |
| Dark mode         | `next-themes`            | `^0.4.6`                         |
| Validation        | `zod`                    | `^4.5.4`                         |
| Test              | `vitest`                 | `^5.0.0`                         |
| Coverage          | `@vitest/coverage-v8`    | `^5.0.0`                         |
| DOM env           | `jsdom`                  | `^30.0.1`                        |
| Component test    | `@testing-library/react` | `^16.3.3`                        |
| Vite plugin (dev) | `@vitejs/plugin-react`   | `^6.1.1`                         |
| Lint              | `eslint`                 | `^10.10.0`                       |
| Lint (TS rules)   | `typescript-eslint`      | `^8.69.0`                        |
| Lint (Next rules) | `eslint-config-next`     | `^16.3.4`                        |
| Format            | `prettier`               | `^3.9.6`                         |
| Node engine       |                          | `>=22.12.0`                      |

Node floor is **22.12**, set by Vitest 5 (`^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`). Next itself only needs 20.9.

**TypeScript stays on 6.0.3 even though 7.0.2 is `latest`.** `typescript-eslint@8.69.0` declares `typescript: >=4.8.4 <6.1.0`; TS 7 (the native port) is not supported yet. Taking 7 means either no type-aware lint rules or forcing peer deps. 6.0.3 is the newest stable that the whole toolchain agrees on. Revisit when typescript-eslint ships TS 7 support — it is a one-line bump.

`next`, `react`, `react-dom`, `tailwindcss`, `@next/third-parties`, `next-themes`, `zod` are **peerDependencies** — the library bundles none of them, so consumers get exactly one copy.

**Deliberately not depending on:**

- `firebase` — not needed for GA4 on a website. <!-- ponytail: add when a site needs Auth or Firestore -->
- `@web3forms/react` / `@formspree/react` — a `fetch` POST is 5 lines.
- Any analytics SDK — `@next/third-parties` loads gtag; we only wrap consent.

---

## Commands

```
Install deps:  npm ci
Typecheck:     npm run typecheck        # tsc --noEmit
Lint:          npm run lint             # eslint .
Lint + fix:    npm run lint:fix         # eslint . --fix
Format:        npm run format           # prettier --write .
Test:          npm test                 # vitest run
Test (watch):  npm run test:watch       # vitest
Coverage:      npm run test:coverage    # vitest run --coverage
Full gate:     npm run verify           # typecheck && lint && test:coverage
Release:       npm version <patch|minor|major> && git push --follow-tags
```

Consumer side:

```
Add:           npm i github:AldoAdi/Website-template-lib#v1.0.0
Upgrade:       npm i github:AldoAdi/Website-template-lib#v1.1.0
Build (Vercel):        npm run build
Build (GitHub Pages):  DEPLOY_TARGET=github-pages npm run build
```

---

## Project Structure

```
src/
  analytics/
    index.ts            track(), pageView(), initAnalytics() — consent-gated
    gtag.ts             typed window.gtag wrapper
    consent.ts          consent state + localStorage + change events
    GoogleAnalytics.tsx thin wrapper over @next/third-parties, renders only after consent
  theme/
    theme.css           @theme custom properties — the default palette
    ThemeProvider.tsx   next-themes wrapper, class strategy, no-flash
    ThemeToggle.tsx     light / dark / system button
    tokens.ts           TS mirror of the variable names (for typed props)
  components/
    layout/             Header (nav + theme toggle), Footer, Container, Section
    content/            Hero, FeatureGrid, Card, CTA
    form/               ContactForm, Field, useFormPost
    consent/            CookieBanner
  seo/
    metadata.ts         Next Metadata builders (title templates, OG, canonical)
    jsonld.tsx          Organization / WebSite / BreadcrumbList schema
    sitemap.ts          sitemap.xml + robots.txt generators
  security/
    headers.ts          securityHeaders() → HTTP-header shape and meta-tag shape
    validate.ts         zod schemas + sanitizers for form input
    honeypot.ts         hidden-field + time-to-submit spam check
  config/
    defineNextConfig.ts vercel | github-pages next.config builder
  index.ts              Public barrel export
tests/                  Mirrors src/ one-to-one
docs/
  CONSUMING.md          Zero to deployed, both targets
  THEMING.md            Which variables to override
SPEC.md
```

Public API = `src/index.ts` plus the subpath `exports` map (`/analytics`, `/theme`, `/seo`, `/security`, `/config`). Nothing else is importable.

---

## Code Style

Immutable, typed at the boundary, small files. Real example — the analytics core:

```ts
// src/analytics/index.ts
import type { TrackEvent } from './types'
import { hasConsent, onConsentChange } from './consent'
import { gtagEvent } from './gtag'

const MAX_QUEUED_EVENTS = 50

let queue: readonly TrackEvent[] = []

export function initAnalytics(): () => void {
  return onConsentChange((granted) => {
    if (granted) flushQueue()
  })
}

export function track(name: string, props: Readonly<Record<string, unknown>> = {}): void {
  const event: TrackEvent = { name, props, at: Date.now() }

  if (!hasConsent()) {
    // ponytail: drop oldest past the cap; a real buffer lib is overkill for a marketing site
    queue = [...queue, event].slice(-MAX_QUEUED_EVENTS)
    return
  }

  send(event)
}

function flushQueue(): void {
  const pending = queue
  queue = []
  for (const event of pending) send(event)
}

function send(event: TrackEvent): void {
  try {
    gtagEvent(event.name, event.props)
  } catch (error) {
    console.error(`[analytics] failed to send "${event.name}":`, error)
  }
}
```

Rules:

- **Never mutate.** New arrays/objects only (`[...prev, x]`, not `push`).
- `camelCase` values/functions, `PascalCase` types + components, `UPPER_SNAKE_CASE` constants, `use`-prefixed hooks.
- Booleans read as predicates: `hasConsent`, `isReady`, `shouldTrack`.
- No magic numbers — name them.
- Early returns over nesting; max 4 levels.
- Functions < 50 lines, files < 400 lines (hard cap 800).
- Analytics never throws into the page. Wrap and log.
- Explicit param + return types on every export. No `any`; use `unknown` and narrow.
- Components take no color props. They read CSS variables.
- `'use client'` only where genuinely needed (theme toggle, consent banner, forms). Everything else stays a server component so static export stays small.

---

## Testing Strategy

- **Framework:** Vitest 5, jsdom 30, React Testing Library 16.
- **Location:** `tests/` mirroring `src/` — `tests/analytics/index.test.ts`.
- **Coverage floor:** 80% lines and branches via `@vitest/coverage-v8`; `npm run test:coverage` fails below.
- **TDD:** failing test first (RED) → minimal implementation (GREEN) → refactor.
- **AAA structure**, behavioral names: `test('queues events until consent is granted', ...)`.

Levels:

| Level       | Covers                                                                           | Example                         |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------- |
| Unit        | Consent gate, validators, honeypot, metadata builders, `defineNextConfig` output | `security/validate.test.ts`     |
| Integration | Consent → queue → flush → gtag fan-out, form POST against a `fetch` stub         | `analytics/index.test.ts`       |
| Component   | Render + a11y + interaction                                                      | `consent/CookieBanner.test.tsx` |

**No E2E in this repo.** <!-- ponytail: E2E needs a running site; it belongs in the starter repo. Add a Playwright fixture here only if a component regression slips through three times. -->

`window.gtag` and `fetch` are always stubbed. No test makes a live network call.

---

## Boundaries

**Always:**

- Run `npm run verify` before every commit.
- Write the failing test first.
- Verify the change still builds under `output: 'export'`.
- Bump the version tag for any public-API change; consumers pin by tag.
- Validate and sanitize all form input at the boundary with zod.
- Gate every analytics call behind consent — no beacon fires before opt-in.
- Keep shared deps as `peerDependencies`.
- Escape/sanitize anything rendered from user or CMS input.

**Ask first:**

- Adding any runtime dependency.
- Changing or removing a public export.
- Adding a new analytics provider or backend.
- Renaming a theme CSS variable.
- Introducing a build step, a monorepo, or a second package.
- Adding anything that requires a Node server (breaks GitHub Pages).
- Changing distribution away from git-URL installs.

**Never:**

- Commit secrets, `.env` files, service-account JSON, or API keys. GA measurement ID and form endpoint come from `NEXT_PUBLIC_*` env vars.
- Ship images or site-specific content in this repo.
- Hardcode a hex color, font family, or brand string in a component.
- Fire an analytics event before consent is granted.
- Delete or skip a failing test to make CI green.
- `dangerouslySetInnerHTML` without an explicit sanitizer.
- Break a public export without a major version bump.

---

## Success Criteria

1. `npm run verify` passes clean: 0 type errors, 0 lint errors, ≥80% line and branch coverage.
2. Starter repo builds and deploys **to Vercel** with real security headers, GA4 firing after consent.
3. Same starter repo builds with `DEPLOY_TARGET=github-pages npm run build` and deploys to GitHub Pages — correct `basePath`, working assets, CSP meta tag present.
4. Overriding 6 CSS variables in the site's `globals.css` restyles every library component — verified on two differently-themed starter clones.
5. Dark mode toggles with no flash of wrong theme on first paint, and remembers the choice across reloads.
6. `track('cta_click')` sends nothing before consent; the queue flushes to gtag the instant consent is granted. Covered by a test.
7. Contact form POSTs to the configured endpoint, rejects invalid input client-side via zod, and silently drops honeypot hits.
8. `securityHeaders()` output scores A or better on securityheaders.com for the Vercel deploy.
9. `grep -rEi '#[0-9a-f]{3,8}\b' src/components/` returns nothing.
10. `docs/CONSUMING.md` gets a new site from zero to deployed in under 15 minutes.

---

## Resolved Decisions

1. **Form endpoint: Web3Forms.** Unlimited free tier, no account tier limits, access key only. `ContactForm` takes `endpoint` + `accessKey` props, so swapping to Formspree later is a props change, not a rewrite. Key lives in `NEXT_PUBLIC_WEB3FORMS_KEY`.
   > The Web3Forms access key is public by design — it identifies the destination inbox, it is not a credential. Anyone can read it from the page source and POST to it. Spam control is the honeypot plus Web3Forms' own filtering, not key secrecy. Do not treat it as a secret, and do not put a real secret in any `NEXT_PUBLIC_*` var.
2. **GitHub Pages: project pages.** `aldoadi.github.io/<repo>`, so `basePath` + `assetPrefix` are set from `repoName`. `defineNextConfig` treats `repoName` as optional — omit it for a custom domain and no `basePath` is emitted.
3. **Starter ships the sample page** described above, not an empty shell.
4. **v1 component list = exactly what the sample page renders.** Cut from the earlier draft: `Nav` (folded into `Header`), `Prose`, standalone `Feature`. Add back when a real page needs them.

## Open Questions

None blocking. Ready to plan.

---

## Amendment: the booking module (v0.2)

Added after a client need the v1 scope did not anticipate: a practice whose
booking CTA hands off to a third-party scheduler cannot fire any tag it owns on
the conversion, so its paid search spend is unattributable.

This touches three "Ask first" boundaries. Recording the answers here.

**1. "Adding anything that requires a Node server (breaks GitHub Pages)."**

The client half does not. `/book` is a static page: attribution parsing, cookie
minting, event emission and the redirect are all client-side, so
Assumption 4 holds unchanged and the starter still deploys to Pages.

The optional server half — an ingest route handler for a site that wants its own
database — lives behind a **separate `./booking/server` subpath**. A static build
never imports it, and it takes a `Request` and returns a `Response` rather than
importing from `next`, so it stays testable without a server. The floor is now
precisely: _the core is static; `./booking/server` is opt-in and Node-only._

**2. "Adding a new analytics provider or backend."**

No new provider. `createGaSink` delegates to the existing `track()`, inheriting
the consent gate and the pre-consent queue. `createHttpSink` targets whatever
first-party endpoint the consuming site chooses; the library ships no client
for it.

**3. "Adding any runtime dependency."**

None added. `BookingStore` is an interface; the Postgres adapter is ~15 lines and
belongs in the consuming site, which keeps the database vendor out of the library
and off every other site's dependency tree.

### The consent decision

`createHttpSink` is consent-gated by default, matching "no beacon fires before
opt-in". The `requiresConsent: false` escape hatch exists because an anonymous,
no-PII, first-party endpoint is treated differently under different regimes. It
is a legal decision, not a technical one, and whoever sets it should say why at
the call site.

`BookingRedirect` never gates the _redirect_ on consent. Someone who rejected the
banner still came to book an appointment.

### The PII line

`BookingEvent` has no field for a name, email, phone, or reason for visit, and
`createIngestHandler` rejects any payload carrying a PII-shaped key at any depth.
This is deliberate and load-bearing: it is what keeps a US healthcare practice's
website analytics out of HIPAA scope. Crossing that line is not a code change,
it is a different project — one needing a BAA-capable host, consent copy, and a
retention policy.

### Known limit

The funnel measures booking **intent**. What happens on the scheduler's domain is
cross-origin and unobservable; an iframe would not change that.
`booking_confirmed` only becomes real if the vendor supports a post-booking
redirect back to a route rendering `BookingConfirmed`. Until then, every number
past `booking_handoff` is a modelled estimate and should be labelled as one.

### Public API added

`./booking` — `BookingLink`, `BookingRedirect`, `BookingConfirmed`,
`recordBookingStep`, `buildBookingUrl`, `parseAttribution`, `recordAttribution`,
`getAttribution`, `getVisitorId`, `getSessionId`, `createGaSink`,
`createHttpSink`, `createMemorySink`, `emitBookingEvent`.

`./booking/server` — `createIngestHandler`, `createMemoryBookingStore`,
`BookingStore`.

Changed: `getHttpSecurityHeaders`, `getMetaSecurityTags`, `securityHeaders` and
`defineNextConfig` take an optional `connectSrc` allowlist extension. Additive
and backwards compatible, but a public-API change — tag a minor version.
