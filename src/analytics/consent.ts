/**
 * Consent gate for the whole analytics story. Nothing downstream (gtag,
 * GoogleAnalytics, track()) may fire before `getConsentState()` reports
 * 'granted'. See SPEC.md Boundaries: "Never fire an analytics event before
 * consent is granted."
 */
export type ConsentState = 'unknown' | 'granted' | 'denied'

export type ConsentListener = (state: ConsentState) => void

const STORAGE_KEY = 'consent-decision'
const GRANTED_VALUE = 'granted'
const DENIED_VALUE = 'denied'

let listeners: readonly ConsentListener[] = []

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function parseConsentState(raw: string | null): ConsentState {
  if (raw === GRANTED_VALUE) return 'granted'
  if (raw === DENIED_VALUE) return 'denied'
  return 'unknown'
}

/**
 * Reads the persisted decision. Never touches `window` during server
 * rendering, and never throws: Safari private mode and cookie-blocked
 * browsers throw on property access to `localStorage` itself, not just on
 * `.getItem()`, so both are covered by the same try/catch.
 */
export function getConsentState(): ConsentState {
  if (!isBrowser()) return 'unknown'

  try {
    return parseConsentState(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'unknown'
  }
}

/** True only once the visitor has explicitly granted consent. */
export function hasConsent(): boolean {
  return getConsentState() === 'granted'
}

function persist(value: string): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage may be unavailable (Safari private mode, blocked cookies, a
    // full quota). The decision simply does not survive a reload; it must
    // never crash the page or block the in-memory notification below.
  }
}

function notify(state: ConsentState): void {
  for (const listener of listeners) listener(state)
}

/** Persists an explicit grant and notifies subscribers. */
export function grantConsent(): void {
  persist(GRANTED_VALUE)
  notify('granted')
}

/** Persists an explicit denial and notifies subscribers. */
export function denyConsent(): void {
  persist(DENIED_VALUE)
  notify('denied')
}

/**
 * Clears the stored decision and returns the visitor to `'unknown'`, which
 * brings `CookieBanner` back.
 *
 * This exists for testing and for the debug overlay, not for site copy: a
 * banner that reappears on its own after a decision is a dark pattern. It is
 * here because the stored decision is otherwise invisible and unreachable --
 * the banner hides itself once answered, so someone verifying a tag setup on
 * a site they have already used sees no banner, concludes the consent gate is
 * broken, and goes looking in the wrong place. That has now happened more
 * than once.
 */
export function resetConsent(): void {
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Same storage caveats as `persist`: the in-memory notification below
      // still has to happen, so subscribers re-render either way.
    }
  }

  notify('unknown')
}

/**
 * Subscribes to consent changes, returning an unsubscribe function.
 * Components react to a decision without polling `getConsentState()`.
 */
export function onConsentChange(listener: ConsentListener): () => void {
  listeners = [...listeners, listener]

  return () => {
    listeners = listeners.filter((registered) => registered !== listener)
  }
}
