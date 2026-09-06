/**
 * Typed wrapper over the global `window.gtag`. GA4's own loader
 * (`@next/third-parties`'s <GoogleAnalytics>, see GoogleAnalytics.tsx)
 * is what actually defines this global by injecting a script tag; this
 * module never assumes it exists, and it never throws if it is missing or
 * misbehaves -- callers (see `index.ts`'s `send()`) are responsible for
 * catching. SPEC.md: "Analytics never throws into the page."
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

let hasWarnedMissingGaId = false

/**
 * Resolves the GA4 measurement ID from the environment. Read fresh on every
 * call rather than cached, so a consuming app's env can change between
 * calls in tests; in a real Next.js build `process.env.NEXT_PUBLIC_*` is
 * inlined by the bundler anyway, so this is a zero-cost lookup either way.
 *
 * A missing id is the normal state during local development -- most
 * developers do not wire a real GA property into `.env.local` -- so that
 * case stays silent. In production it more likely means a misconfigured
 * deploy, worth exactly one console warning (never one per event, which
 * would flood the console the moment traffic starts flowing).
 */
export function getGaId(): string | undefined {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (gaId) return gaId

  if (process.env.NODE_ENV === 'production' && !hasWarnedMissingGaId) {
    hasWarnedMissingGaId = true
    console.warn(
      '[analytics] NEXT_PUBLIC_GA_ID is not set. Analytics is disabled until it is configured.',
    )
  }

  return undefined
}

/** Fires a GA4 event through `window.gtag`. A no-op if gtag has not loaded. */
export function gtagEvent(name: string, props: Readonly<Record<string, unknown>>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

  window.gtag('event', name, props)
}
