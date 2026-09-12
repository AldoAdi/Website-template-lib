/**
 * Security headers in two shapes, per SPEC.md's deploy-target table:
 *
 *  - `http` — a `{ key, value }` array suitable for Next's `headers()`
 *    config (wired into `defineNextConfig`'s `vercel` target). Real HTTP
 *    response headers, sent by a server on every request.
 *  - `meta` — a `<meta http-equiv>` set for static hosting (GitHub Pages).
 *    `output: 'export'` produces files with no server to attach response
 *    headers to, so this is the only delivery mechanism available there.
 *
 * THE TWO SHAPES ARE NOT EQUIVALENT. Browsers only honor a handful of
 * headers when they arrive via `<meta http-equiv>`, and `Content-Security-
 * Policy` is the one security header on that short list. Two protections
 * this module ships for Vercel have **no meta equivalent at all** and are
 * silently ignored by the browser if you try:
 *
 *  - `frame-ancestors` (a CSP directive) — the CSP spec itself carves this
 *    directive out as meta-ineffective (https://www.w3.org/TR/CSP3/,
 *    "note that report-uri, frame-ancestors, and sandbox directives are
 *    ignored when delivered in a <meta> element"). Clickjacking protection
 *    is therefore Vercel-only.
 *  - `Strict-Transport-Security` (HSTS) — HSTS is defined purely in terms
 *    of the HTTP response (RFC 6797); there is no `<meta>` form at all.
 *    GitHub Pages already serves over HTTPS and redirects HTTP to it, but
 *    that is GitHub's platform behavior, not something this library adds
 *    or can add for a static export.
 *
 * `getMetaSecurityTags` therefore emits CSP only, and its CSP string omits
 * `frame-ancestors` entirely rather than including a directive the browser
 * would just discard — see `tests/security/headers.test.ts` for the tests
 * that pin both omissions down, so the weakness is enforced by CI, not
 * just this comment.
 *
 * VERCEL PATH IS UNVERIFIED AGAINST A REAL DEPLOY. Per the 2026-09-06
 * decision recorded in tasks/todo.md's Checkpoint E, this project ships to
 * GitHub Pages only for now — there is no live Vercel deployment to run
 * through securityheaders.com. Both shapes are unit-tested for correct
 * *output*, but the HTTP shape's real-world grade is unconfirmed.
 *
 * `script-src` NEEDS `'unsafe-inline'`, AND THAT IS A KNOWN, DELIBERATE
 * WEAKENING — not an oversight:
 *  - `next-themes` (see `src/theme/ThemeProvider.tsx`) injects a small
 *    blocking inline `<script>` into `<head>` that sets the `.dark` class
 *    before first paint. That is the entire no-flash mechanism; blocking
 *    it breaks dark mode.
 *  - Next.js itself inlines bootstrap/hydration `<script>` tags it does
 *    not let a consumer opt out of.
 *  - `@next/third-parties`'s `<GoogleAnalytics>` (see
 *    `src/analytics/GoogleAnalytics.tsx`) renders an inline `_next-ga-init`
 *    script (`gtag('js', ...); gtag('config', ...)`) alongside the
 *    `googletagmanager.com` script tag.
 *  A nonce-based CSP (`script-src 'nonce-<random>'`) would remove the need
 *  for `'unsafe-inline'`, but a nonce must be generated fresh per request
 *  by a server and threaded into both the HTTP header and the HTML it
 *  matches. `output: 'export'` has no per-request server — the HTML is
 *  built once, ahead of time — so there is no request to generate a nonce
 *  for. Nonces are simply not available to a statically exported site, on
 *  either deploy target, as long as this library targets a shared static
 *  export. Shipping `script-src 'self'` with no `'unsafe-inline'` and no
 *  nonce would silently break dark mode and GA4, which is worse than
 *  documenting the real tradeoff.
 *
 * CSP allowlist, directive by directive:
 *  - `default-src 'self'` — deny-by-default baseline for every fetch
 *    directive not otherwise listed (workers, manifests, media, etc.).
 *  - `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`
 *    — `'self'` for Next's own bundled JS; `'unsafe-inline'` for the
 *    next-themes / Next.js / GA inline scripts above; googletagmanager.com
 *    is where `@next/third-parties`'s `<GoogleAnalytics>` loads
 *    `gtag/js` from (`node_modules/@next/third-parties/dist/google/ga.js`
 *    sets `src: https://www.googletagmanager.com/gtag/js?id=...`).
 *  - `connect-src` — every origin Google's own tag reaches, plus Web3Forms.
 *
 *    This list was originally written from what the *library* calls, and that
 *    is the wrong question. GA4 does not send only to `google-analytics.com`:
 *    with Google signals or Ads conversion measurement enabled it posts to
 *    `www.google.com/g/collect` and `stats.g.doubleclick.net`, and it uses
 *    regional `*.analytics.google.com` hosts depending on geography. Omitting
 *    those produced a live site where gtag loaded with the correct property,
 *    tried to send, and was silently refused -- nothing in GA4, nothing in Tag
 *    Assistant, just no data.
 *
 *    **Known limit, not an oversight:** Google's ads cookie sync also hits
 *    country TLDs (`www.google.co.uk`, `www.google.de`), and CSP cannot
 *    wildcard a TLD. The default covers `www.google.com` only. A site
 *    advertising outside the US adds its own through `connectSrc`/`imgSrc`.
 *
 *    The original note, still true of the rest:
 *    `'self'` for the app's own same-origin requests; the two
 *    google-analytics.com origins are where the loaded gtag.js library
 *    sends GA4 collection beacons (the wildcard covers the region-sharded
 *    subdomains, e.g. `region1.google-analytics.com`, that GA4 uses
 *    depending on visitor geography); `api.web3forms.com` is the exact
 *    endpoint `useFormPost`'s `fetch` POSTs the contact form to
 *    (`src/components/form/ContactForm.tsx`'s `DEFAULT_ENDPOINT`).
 *  - `img-src 'self' data: <googletagmanager> <google-analytics x2>` —
 *    `'self'` for whatever `/public` assets a consuming site adds; `data:`
 *    for small inline icons a consumer might pass through `next/image`.
 *
 *    The Google origins are here because of what this library's own
 *    components *do*, not what it ships as files. An earlier version listed
 *    only `'self' data:`, reasoning that the library ships zero images of
 *    its own — true, and beside the point: `<GoogleTagManager>` causes the
 *    browser to request `googletagmanager.com/td` (tag diagnostics) as an
 *    image, and gtag falls back to an image beacon when `sendBeacon` and
 *    `fetch` are both unavailable. That omission surfaced as a console
 *    error on a live site, which is the wrong place to discover it.
 *
 *    The rule the fix encodes: an origin the library's own integrations
 *    cause the browser to hit belongs in the default policy. `options.imgSrc`
 *    is for the pixels a *consumer* adds on top (Google Ads, Meta).
 *  - `style-src 'self' 'unsafe-inline'` — Tailwind v4 compiles to a linked
 *    stylesheet and no component here writes a `style=` attribute, so the
 *    emitted HTML looks like it needs no exception. It does anyway:
 *    next-themes assigns `documentElement.style.colorScheme` at runtime,
 *    which a bare `style-src 'self'` blocks. This was caught by loading the
 *    built page in a browser; reading the static output cannot reveal it.
 *  - `font-src 'self'` — for a consumer's self-hosted font files, if any.
 *  - `base-uri 'self'` — blocks `<base>`-tag injection from redirecting
 *    every relative URL on the page.
 *  - `object-src 'none'` — no plugin content (Flash-era attack surface);
 *    always safe to close.
 *  - `frame-ancestors 'none'` — HTTP-only (see above): blocks the page
 *    from being framed by another origin. Omitted from the meta CSP
 *    because a meta-delivered `frame-ancestors` is ignored by the browser
 *    per the CSP spec, and shipping it there would be theatre.
 *
 * No directive here uses `'unsafe-eval'`.
 */

const GOOGLE_TAG_MANAGER_ORIGIN = 'https://www.googletagmanager.com'
const GOOGLE_ANALYTICS_ORIGIN = 'https://www.google-analytics.com'
const GOOGLE_ANALYTICS_WILDCARD = 'https://*.google-analytics.com'
// GA4's regional collection endpoints.
const GOOGLE_ANALYTICS_REGIONAL = 'https://*.analytics.google.com'
// Where GA4 posts when Google signals or Ads conversion measurement is in play.
// Missing this is what produced "connect-src blocked https://www.google.com/g/collect"
// on a live site: gtag loaded with the right property, tried to send, and the
// browser refused. No error in GA4, no error in Tag Assistant -- just no data.
const GOOGLE_ADS_COLLECT_ORIGIN = 'https://www.google.com'
// Google signals' own collection host.
const DOUBLECLICK_STATS_ORIGIN = 'https://stats.g.doubleclick.net'
const WEB3FORMS_ORIGIN = 'https://api.web3forms.com'

const HSTS_MAX_AGE_SECONDS = 63_072_000 // two years, the value securityheaders.com expects for full credit

export interface HttpSecurityHeader {
  readonly key: string
  readonly value: string
}

export interface MetaSecurityTag {
  readonly httpEquiv: string
  readonly content: string
}

export interface SecurityHeaders {
  /** Real HTTP response headers — wire these into Next's `headers()` (Vercel only). */
  readonly http: readonly HttpSecurityHeader[]
  /** `<meta http-equiv>` tags for static hosting (GitHub Pages). CSP only — see module docs. */
  readonly meta: readonly MetaSecurityTag[]
}

export interface SecurityHeaderOptions {
  /**
   * Extra origins appended to `connect-src`.
   *
   * The default allowlist covers only what the library itself talks to
   * (GA4 and Web3Forms). A site that points `createHttpSink` at its own
   * ingest endpoint on another origin, or adds any other beacon, has to
   * declare it here or the browser blocks the request -- and a CSP-blocked
   * beacon fails silently, which looks exactly like "the funnel does not
   * work" with nothing in the network tab to explain it.
   *
   * A same-origin endpoint (`/api/booking-event`) is already covered by
   * `'self'` and needs no entry.
   */
  readonly connectSrc?: readonly string[]
  /**
   * Extra origins appended to `script-src`.
   *
   * A GTM container is a script loader: every tag a marketer adds inside it
   * pulls from some origin the library never anticipated. A CSP-blocked tag
   * fails silently, which is indistinguishable from "the tag is
   * misconfigured" -- so this is usually the first thing to check when a
   * container works in Preview but not on the live site.
   */
  readonly scriptSrc?: readonly string[]
  /**
   * Extra origins appended to `img-src`. Conversion pixels (Google Ads,
   * Meta) load this way.
   */
  readonly imgSrc?: readonly string[]
}

/**
 * Origins are concatenated into a CSP string, where a stray space or
 * semicolon would silently end one directive and start another. Rejecting
 * them is safer than emitting a policy that reads as valid but is not the
 * one that was asked for.
 */
function normalizeOrigins(origins: readonly string[] | undefined): readonly string[] {
  if (origins === undefined) return []

  return origins
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '' && !/[\s;,]/.test(origin))
}

/**
 * Directives shared by both delivery shapes. `frame-ancestors` is added
 * separately, only for the HTTP shape — see module docs for why a
 * meta-delivered `frame-ancestors` would be silently ignored by the browser.
 */
function buildBaseCspDirectives(options: SecurityHeaderOptions = {}): readonly string[] {
  const connectSrc = [
    "'self'",
    GOOGLE_ANALYTICS_ORIGIN,
    GOOGLE_ANALYTICS_WILDCARD,
    GOOGLE_ANALYTICS_REGIONAL,
    // GTM's container fetch and its consent/config pings both go here.
    GOOGLE_TAG_MANAGER_ORIGIN,
    // GA4 does not send only to google-analytics.com. See the constants.
    GOOGLE_ADS_COLLECT_ORIGIN,
    DOUBLECLICK_STATS_ORIGIN,
    WEB3FORMS_ORIGIN,
    ...normalizeOrigins(options.connectSrc),
  ].join(' ')

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    GOOGLE_TAG_MANAGER_ORIGIN,
    ...normalizeOrigins(options.scriptSrc),
  ].join(' ')

  const imgSrc = [
    "'self'",
    'data:',
    // GTM pings /td (tag diagnostics) as an image, and gtag falls back to an
    // image beacon when sendBeacon and fetch are both unavailable. Both are
    // the library's own components talking, so both belong in the default.
    GOOGLE_TAG_MANAGER_ORIGIN,
    GOOGLE_ANALYTICS_ORIGIN,
    GOOGLE_ANALYTICS_WILDCARD,
    GOOGLE_ADS_COLLECT_ORIGIN,
    DOUBLECLICK_STATS_ORIGIN,
    ...normalizeOrigins(options.imgSrc),
  ].join(' ')

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc}`,
    `img-src ${imgSrc}`,
    // 'unsafe-inline' is required here for the same structural reason as
    // script-src, and it was found by loading the built page in a real
    // browser -- not by reading the emitted HTML, which contains no <style>
    // tags and no style attributes at all. next-themes' no-flash script
    // assigns `document.documentElement.style.colorScheme` at runtime, and
    // a style-src without 'unsafe-inline' blocks that assignment:
    //   "Applying inline style violates the following Content Security
    //    Policy directive 'style-src 'self''. The action has been blocked."
    // A hash cannot cover it (the value is computed per visitor) and a
    // nonce needs a per-request server, which output: 'export' does not
    // have. Blocking it would leave the browser's form controls and
    // scrollbars in the wrong colour scheme in dark mode.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ]
}

function buildHttpCsp(options: SecurityHeaderOptions): string {
  return [...buildBaseCspDirectives(options), "frame-ancestors 'none'"].join('; ')
}

function buildMetaCsp(options: SecurityHeaderOptions): string {
  return buildBaseCspDirectives(options).join('; ')
}

/**
 * Real HTTP response headers for the Vercel target. See module docs for
 * the full CSP rationale and the `'unsafe-inline'` tradeoff.
 */
export function getHttpSecurityHeaders(
  options: SecurityHeaderOptions = {},
): readonly HttpSecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: buildHttpCsp(options) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    {
      key: 'Strict-Transport-Security',
      value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
    },
  ]
}

/**
 * `<meta http-equiv>` tags for static hosting (GitHub Pages). CSP only,
 * and that CSP omits `frame-ancestors` — browsers ignore it in a meta tag,
 * and `Strict-Transport-Security` / `X-Frame-Options` / etc. have no meta
 * form at all, so this genuinely provides less protection than the HTTP
 * shape. See module docs.
 */
export function getMetaSecurityTags(
  options: SecurityHeaderOptions = {},
): readonly MetaSecurityTag[] {
  return [{ httpEquiv: 'Content-Security-Policy', content: buildMetaCsp(options) }]
}

/**
 * Both shapes at once. Prefer the individual getters when you only need
 * one (e.g. `defineNextConfig` only ever needs `getHttpSecurityHeaders`).
 */
export function securityHeaders(options: SecurityHeaderOptions = {}): SecurityHeaders {
  return { http: getHttpSecurityHeaders(options), meta: getMetaSecurityTags(options) }
}
