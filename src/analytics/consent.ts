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
 * Subscribes to consent changes, returning an unsubscribe function.
 * Components react to a decision without polling `getConsentState()`.
 */
export function onConsentChange(listener: ConsentListener): () => void {
  listeners = [...listeners, listener]

  return () => {
    listeners = listeners.filter((registered) => registered !== listener)
  }
}
