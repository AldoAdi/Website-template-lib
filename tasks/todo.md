# Task List: `@aldoadi/website-template` v0.1.0

Plan: [plan.md](plan.md) · Spec: [SPEC.md](../SPEC.md)

Every task also clears the Definition of Done in the plan.

---

## Phase 1: Walking Skeleton

### T1: Library scaffold
**Description:** Package metadata, TS config, lint, format, test harness, public exports map. No feature code.

**Acceptance:**
- [ ] `package.json` with pinned versions from the spec table; `next`/`react`/`react-dom`/`tailwindcss`/`@next/third-parties`/`next-themes`/`zod` are `peerDependencies`, not `dependencies`
- [ ] `exports` map exposes `.`, `./analytics`, `./theme`, `./seo`, `./security`, `./config`, `./theme.css`
- [ ] `engines.node >= 22.12.0`; `"type": "module"`
- [ ] `npm run verify` runs and passes on an empty `src/index.ts`

**Verify:** `npm run verify` · `npm pack --dry-run` lists `src/` and excludes `tests/`

**Dependencies:** None
**Files:** `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, `.gitignore`, `src/index.ts`
**Scope:** M

---

### T2: Starter scaffold + git-URL install (RISKIEST TASK)
**Description:** Create the `Website-template-starter` skeleton, install the library from its git URL, render one trivial styled component. Exists purely to prove or kill three spec assumptions in one shot.

**Acceptance:**
- [ ] Library exports a throwaway `<Ping />` using Tailwind utility classes
- [ ] Starter installs it via `npm pack` + tarball install (the remote is empty and pushing is not yet authorized) and adds `transpilePackages`. Real `npm i github:...#<tag>` is confirmed at Checkpoint A once a push is approved.
- [ ] `next build` succeeds — proves raw-TS distribution works with Next 16 + React 19
- [ ] `<Ping />` renders **with its Tailwind styles applied** — proves `@source` scanning of `node_modules` works
- [ ] If any of the above fails: stop, record the failure in the plan's risk table, get a decision before continuing

**Verify:** `npm run build` in starter · load the page and confirm computed styles are not browser defaults

**Dependencies:** T1
**Files:** starter `package.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`; library `src/Ping.tsx`
**Scope:** M

---

### T3: `defineNextConfig` — both deploy targets
**Description:** One config builder emitting Vercel or GitHub Pages settings. Delete `<Ping />` at the end.

**Acceptance:**
- [ ] `defineNextConfig({ target, repoName? })` returns correct `output`, `basePath`, `assetPrefix`, `images.unoptimized`, `trailingSlash`
- [ ] Omitting `repoName` emits no `basePath` (custom-domain case)
- [ ] `npm run build` and `DEPLOY_TARGET=github-pages npm run build` both succeed
- [ ] Static output served from a subpath has working asset URLs — verified, not assumed
- [ ] `<Ping />` removed from library and starter

**Verify:** both builds · `npx serve out` and load the page with assets · unit test on config output for all three cases

**Dependencies:** T2
**Files:** `src/config/defineNextConfig.ts`, `tests/config/defineNextConfig.test.ts`, starter `next.config.ts`
**Scope:** S

---

### ✅ Checkpoint A — Architecture
- [ ] Both builds green
- [ ] Tailwind styles reach components shipped from `node_modules`
- [ ] Static build works from a subpath
- [ ] **Human review — this checkpoint decides whether the whole approach holds**

---

## Phase 2: Theme foundation

### T4: Theme tokens, provider, toggle
**Description:** CSS custom properties as the palette, `next-themes` for the light/dark class swap, a toggle component.

**Acceptance:**
- [ ] `theme.css` defines the full token set under `@theme` — colors, fonts, radii, spacing scale
- [ ] Dark values defined for every color token
- [ ] `tokens.ts` mirrors the variable names for typed props
- [ ] `<ThemeProvider>` wraps the app, class strategy, `defaultTheme="system"`
- [ ] `<ThemeToggle>` cycles light → dark → system, keyboard accessible, has an accessible name
- [ ] **No flash of wrong theme** on hard reload in the static build
- [ ] Overriding a token in the starter's `globals.css` visibly changes output

**Verify:** RTL test on toggle a11y + cycling · hard reload with network throttled, both targets · override one token and diff a screenshot

**Dependencies:** T3
**Files:** `src/theme/theme.css`, `tokens.ts`, `ThemeProvider.tsx`, `ThemeToggle.tsx`, `tests/theme/ThemeToggle.test.tsx`
**Scope:** M

---

### T5: Layout primitives
**Description:** `Container`, `Section`, `Header` (nav + theme toggle), `Footer`.

**Acceptance:**
- [ ] All four render from tokens only — `grep` for hex colors finds nothing
- [ ] `Header` takes `logo` and `links`, renders `ThemeToggle`, collapses on mobile
- [ ] Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Server components except where interactivity forces `'use client'`

**Verify:** RTL render + landmark-role tests · axe check on the shell · both builds

**Dependencies:** T4
**Files:** `src/components/layout/*.tsx`, `tests/components/layout/*.test.tsx`, starter `app/page.tsx`
**Scope:** M

---

### ✅ Checkpoint B — Theme
- [ ] Sample page shell renders on both targets
- [ ] Dark mode toggles, persists, no flash
- [ ] Six-variable override restyles everything
- [ ] First real GitHub Pages deploy succeeds
- [ ] Human review

---

## Phase 3: Content components

### T6: `Hero` + `CTA`
**Acceptance:**
- [ ] `Hero`: headline, subhead, optional eyebrow, primary + optional secondary action, optional image slot
- [ ] `CTA`: heading, body, one action, full-bleed band
- [ ] Heading levels are props, not hardcoded — the page keeps exactly one `h1`
- [ ] No hardcoded colors or copy

**Verify:** RTL render tests · axe heading-order check · both builds
**Dependencies:** T5
**Files:** `src/components/content/Hero.tsx`, `CTA.tsx`, tests, starter page
**Scope:** S

---

### T7: `Card` + `FeatureGrid`
**Acceptance:**
- [ ] `Card`: icon slot, title, body, optional link; whole card clickable without nesting interactive elements
- [ ] `FeatureGrid`: responsive 1/2/3 columns, takes `Card` children
- [ ] CSS grid, no JS layout

**Verify:** RTL render · responsive check at 375/768/1280 · both builds
**Dependencies:** T5
**Files:** `src/components/content/Card.tsx`, `FeatureGrid.tsx`, tests, starter page
**Scope:** S

---

### ✅ Checkpoint C — Visual
- [ ] Sample page complete except form and consent banner
- [ ] Renders correctly at three breakpoints, both themes
- [ ] Human review of the actual look

---

## Phase 4: Behavior (TDD — failing test first)

### T8: Consent module + `CookieBanner`
**Description:** Consent state, persistence, change subscription, banner UI. The gate for everything analytics.

**Acceptance:**
- [ ] `hasConsent()`, `grantConsent()`, `denyConsent()`, `onConsentChange(cb)` returning an unsubscribe
- [ ] Persists to `localStorage`; a corrupt or missing value reads as "not granted" and never throws
- [ ] SSR-safe: no `window` access during render
- [ ] `CookieBanner` is keyboard-navigable, non-modal, and does not block content underneath
      > Revised during T8. The original line also asked for a focus trap, which contradicts
      > "does not block content underneath" -- a focus trap is precisely what blocks the rest
      > of the page for keyboard and screen-reader users. A consent banner is not a modal
      > dialog: it is a `role="region"` landmark the visitor can scroll past and return to.
      > "Dismissible" is satisfied by making a decision; there is deliberately no dismiss-
      > without-deciding control, since ignoring the banner must not read as consent.
- [ ] Denying is as easy as accepting — equal visual weight

**Verify:** `npx vitest run tests/analytics/consent` — written failing first · axe on the banner · manual: clear storage, reload, zero GA requests in Network tab
**Dependencies:** T4
**Files:** `src/analytics/consent.ts`, `src/components/consent/CookieBanner.tsx`, tests
**Scope:** M

---

### T9: Analytics — gtag, track, queue, GA component
**Description:** Consent-gated GA4. Pre-consent events go to a bounded queue and flush on grant.

**Acceptance:**
- [ ] `track(name, props)` sends nothing while consent is absent
- [ ] Queue caps at `MAX_QUEUED_EVENTS` (50), dropping oldest
- [ ] Granting consent flushes the queue in order, then clears it
- [ ] A throwing gtag is caught and logged, never propagates into the page
- [ ] `<GoogleAnalytics>` renders the script only after consent; ID from `NEXT_PUBLIC_GA_ID`
- [ ] Missing `NEXT_PUBLIC_GA_ID` disables analytics silently in dev, warns once in prod

**Verify:** `npx vitest run tests/analytics` with stubbed `window.gtag` — failing first · manual: zero `google-analytics.com` requests pre-consent, events appear post-consent
**Dependencies:** T8
**Files:** `src/analytics/index.ts`, `gtag.ts`, `GoogleAnalytics.tsx`, `types.ts`, tests
**Scope:** M

---

### T10: Validation + honeypot
**Acceptance:**
- [ ] zod schema for name / email / message with length bounds and a real email check
- [ ] Sanitizer strips control characters and trims
- [ ] `honeypot.ts`: hidden field must be empty, and submit time must be ≥ a minimum dwell after mount
- [ ] Honeypot rejection is silent — UI reports success, nothing is sent

**Verify:** `npx vitest run tests/security` — failing first, table-driven including unicode and oversize input
**Dependencies:** T1 (parallelizable with Phase 2)
**Files:** `src/security/validate.ts`, `honeypot.ts`, tests
**Scope:** S

---

### T11: `ContactForm` + `useFormPost`
**Acceptance:**
- [ ] Fields validate on blur and on submit; errors tied to inputs via `aria-describedby`
- [ ] Submits to the `endpoint` prop with `accessKey`; defaults to Web3Forms
- [ ] Loading, success, and error states announced via `aria-live`
- [ ] Network failure shows a retryable error and never loses what the user typed
- [ ] Honeypot wired in and silent
- [ ] Works in the static export — no route handler

**Verify:** RTL: valid submit, invalid submit, network failure, honeypot trip — all with stubbed `fetch` · one real submission against a live Web3Forms key
**Dependencies:** T5, T10
**Files:** `src/components/form/ContactForm.tsx`, `Field.tsx`, `useFormPost.ts`, tests, starter page
**Scope:** M

---

### ✅ Checkpoint D — Behavior
- [ ] Coverage ≥80% lines and branches
- [ ] Test proves zero network beacons before consent
- [ ] Real form submission received
- [ ] Human review

---

## Phase 5: SEO and security

### T12: Metadata + JSON-LD
**Acceptance:**
- [ ] `buildMetadata()` produces title template, description, canonical, OG, Twitter card
- [ ] Canonical URLs correct under `basePath`
- [ ] `<JsonLd>` emits valid `Organization` and `WebSite` schema
- [ ] No `dangerouslySetInnerHTML` without JSON serialization that escapes `<`

**Verify:** unit tests on output shape · Google Rich Results test on the deployed page
**Dependencies:** T1 (parallelizable)
**Files:** `src/seo/metadata.ts`, `jsonld.tsx`, tests
**Scope:** S

---

### T13: Sitemap + robots
**Acceptance:**
- [ ] Both emit into the static export — verified present in `out/`
- [ ] URLs respect `basePath` and the site's base URL
- [ ] robots blocks nothing on production, blocks everything on preview deploys

**Verify:** `DEPLOY_TARGET=github-pages npm run build && ls out/sitemap.xml out/robots.txt` · validate the XML
**Dependencies:** T12
**Files:** `src/seo/sitemap.ts`, tests, starter `app/sitemap.ts`, `app/robots.ts`
**Scope:** S

---

### T14: Security headers, both shapes
**Acceptance:**
- [ ] `securityHeaders()` returns an HTTP-header array (Vercel) and a meta-tag set (Pages)
- [ ] CSP allows GA4 and Web3Forms and nothing else; no `unsafe-eval`
- [ ] Wired into `defineNextConfig` for the Vercel target
- [ ] Documented plainly: the GitHub Pages variant cannot set `frame-ancestors` or HSTS and is weaker

**Verify:** unit test on both output shapes · deployed Vercel site scores A on securityheaders.com · zero CSP violations in console on the sample page
**Dependencies:** T3, T9, T11
**Files:** `src/security/headers.ts`, tests, `src/config/defineNextConfig.ts`
**Scope:** M

---

### ✅ Checkpoint E — SEO + Security
- [ ] securityheaders.com grade A on Vercel
- [ ] Rich Results passes
- [ ] Sitemap and robots present in static output
- [ ] No console CSP violations
- [ ] Human review

---

## Phase 6: Ship

### T15: Docs
**Acceptance:**
- [ ] `CONSUMING.md`: zero to deployed, both targets, every env var listed
- [ ] `THEMING.md`: every overridable variable in a table with its default
- [ ] Web3Forms key documented as public-by-design, not a secret
- [ ] A second person could follow it without asking questions

**Verify:** clone the starter into a fresh directory, follow the doc literally, time it — target under 15 minutes
**Dependencies:** T1–T14
**Files:** `docs/CONSUMING.md`, `docs/THEMING.md`, `README.md`
**Scope:** S

---

### T16: Tag and deploy
**Acceptance:**
- [ ] Library tagged `v0.1.0` and pushed to `Website-template-lib`
- [ ] Starter pushed to `Website-template-starter`, pinned to that tag
- [ ] Live on Vercel and on GitHub Pages
- [ ] Every success criterion in the spec checked off, in writing

**Verify:** both URLs load · GA4 realtime shows a test event after consent · a submitted form arrives
**Dependencies:** T15
**Files:** git tags, CI workflow, deploy config
**Scope:** S

---

### ✅ Checkpoint F — Complete
- [ ] All 10 spec success criteria verified
- [ ] Both sites live
- [ ] Human sign-off
