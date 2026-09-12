/**
 * Consent gate for the whole analytics story. Nothing downstream (gtag,
 * GoogleAnalytics, track()) may fire before `getConsentState()` reports
 * 'granted'. See SPEC.md Boundaries: "Never fire an analytics event before
 * consent is granted."
 */
export type ConsentState = 'unknown' | 'granted' | 'denied'

export type ConsentListener = (state: ConsentState) => void

/**
 * The four buckets every EU-facing consent panel ends up with, in the order
 * they are shown.
 *
 * `functional` is strictly necessary storage -- the consent decision itself,
 * the theme choice, a session id. It is listed so the panel can say what the
 * site stores rather than pretend it stores nothing, and it is never
 * togglable: a visitor who could switch it off would be switching off the
 * record of having switched it off.
 */
export const CONSENT_CATEGORIES = ['functional', 'preferences', 'statistics', 'marketing'] as const

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number]

export type ConsentCategories = Readonly<Record<ConsentCategory, boolean>>

const STORAGE_KEY = 'consent-decision'
const CATEGORIES_STORAGE_KEY = 'consent-categories'
const GRANTED_VALUE = 'granted'
const DENIED_VALUE = 'denied'

// Strictly necessary storage is on in every state, including 'unknown' --
// the site cannot remember the visitor said no without writing that down.
const NONE_GRANTED: ConsentCategories = {
  functional: true,
  preferences: false,
  statistics: false,
  marketing: false,
}

const ALL_GRANTED: ConsentCategories = {
  functional: true,
  preferences: true,
  statistics: true,
  marketing: true,
}

let listeners: readonly ConsentListener[] = []

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function parseConsentState(raw: string | null): ConsentState {
  if (raw === GRANTED_VALUE) return 'granted'
  if (raw === DENIED_VALUE) return 'denied'
  return 'unknown'
}

function readStorage(key: string): string | null {
  if (!isBrowser()) return null

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Reads the persisted decision. Never touches `window` during server
 * rendering, and never throws: Safari private mode and cookie-blocked
 * browsers throw on property access to `localStorage` itself, not just on
 * `.getItem()`, so both are covered by the same try/catch.
 */
export function getConsentState(): ConsentState {
  return parseConsentState(readStorage(STORAGE_KEY))
}

/**
 * True only once the visitor has granted the statistics category.
 *
 * `hasConsent()` and `getConsentState() === 'granted'` are the same
 * question, deliberately: the overall decision *is* the statistics decision
 * (see `setConsentCategories`), so the analytics gate keeps its original
 * one-line meaning even now that a panel can express four answers.
 */
export function hasConsent(): boolean {
  return getConsentState() === 'granted'
}

function parseCategories(raw: string | null, fallback: ConsentCategories): ConsentCategories {
  if (raw === null) return fallback

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Hand-edited or half-written storage. Fall back rather than throw --
    // a corrupt preferences blob must not take the page down, and the
    // fallback is always the conservative reading of the stored decision.
    return fallback
  }

  if (typeof parsed !== 'object' || parsed === null) return fallback

  const record = parsed as Record<string, unknown>

  return CONSENT_CATEGORIES.reduce<Record<ConsentCategory, boolean>>(
    (accumulator, category) => ({
      ...accumulator,
      [category]: category === 'functional' ? true : record[category] === true,
    }),
    { ...fallback },
  )
}

/**
 * Per-category decisions, derived from the stored decision when no detailed
 * record exists.
 *
 * The derivation matters for sites that upgrade: a visitor who accepted
 * under the old single-button banner has a stored `'granted'` and no
 * category blob, and must not be re-prompted. They read back as
 * all-granted, which is what that click meant at the time.
 */
export function getConsentCategories(): ConsentCategories {
  const state = getConsentState()
  if (state === 'unknown') return NONE_GRANTED

  return parseCategories(
    readStorage(CATEGORIES_STORAGE_KEY),
    state === 'granted' ? ALL_GRANTED : NONE_GRANTED,
  )
}

/** True when the visitor has granted that specific category. */
export function hasConsentFor(category: ConsentCategory): boolean {
  return getConsentCategories()[category]
}

function persist(key: string, value: string): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage may be unavailable (Safari private mode, blocked cookies, a
    // full quota). The decision simply does not survive a reload; it must
    // never crash the page or block the in-memory notification below.
  }
}

function notify(state: ConsentState): void {
  for (const listener of listeners) listener(state)
}

function writeDecision(categories: ConsentCategories): void {
  // The overall state tracks `statistics` and nothing else, because that is
  // the only category the library itself acts on. Marketing and preferences
  // are recorded for the site's own third-party tags to read via
  // `hasConsentFor` -- the library will not silently widen the analytics
  // gate on their behalf.
  const state: ConsentState = categories.statistics ? 'granted' : 'denied'

  persist(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
  persist(STORAGE_KEY, state === 'granted' ? GRANTED_VALUE : DENIED_VALUE)
  notify(state)
}

/**
 * Records a per-category decision. Unlisted categories default to denied,
 * so a partial object is read as "these and nothing else" rather than as an
 * edit to whatever happened to be stored -- a merge would let an old
 * marketing grant survive a later save the visitor believed was a refusal.
 */
export function setConsentCategories(categories: Partial<ConsentCategories>): void {
  writeDecision(
    CONSENT_CATEGORIES.reduce<Record<ConsentCategory, boolean>>(
      (accumulator, category) => ({
        ...accumulator,
        [category]: category === 'functional' ? true : categories[category] === true,
      }),
      { ...NONE_GRANTED },
    ),
  )
}

/** Persists a grant of every category and notifies subscribers. */
export function grantConsent(): void {
  writeDecision(ALL_GRANTED)
}

/** Persists a refusal of everything optional and notifies subscribers. */
export function denyConsent(): void {
  writeDecision(NONE_GRANTED)
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
    for (const key of [STORAGE_KEY, CATEGORIES_STORAGE_KEY]) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Same storage caveats as `persist`: the in-memory notification
        // below still has to happen, so subscribers re-render either way.
      }
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
