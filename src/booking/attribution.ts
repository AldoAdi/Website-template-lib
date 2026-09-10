import type { Attribution, StoredAttribution } from './types'

/**
 * Attribution capture and persistence.
 *
 * Split into a pure parser (`parseAttribution`) and a storage layer, so the
 * part with all the branching is testable without a DOM and the part that
 * touches `localStorage` stays small enough to read in one go.
 */

const STORAGE_KEY = 'booking-attribution'

/**
 * Query parameter -> `Attribution` field. The click ids keep their wire
 * names because that is what the ad platforms issue and what we hand back
 * to them; only the `utm_*` set gets camel-cased.
 */
const PARAM_MAP: Readonly<Record<string, keyof Attribution>> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
  gclid: 'gclid',
  wbraid: 'wbraid',
  gbraid: 'gbraid',
  fbclid: 'fbclid',
  msclkid: 'msclkid',
}

/** Long enough for any real campaign value, short enough that a crafted URL cannot bloat storage. */
export const MAX_ATTRIBUTION_VALUE_LENGTH = 256

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Values land in storage, in a beacon body, and eventually in a report, so
 * they are trimmed and length-capped at the boundary. Anything that arrives
 * empty is dropped rather than stored as `''` -- an absent campaign and a
 * blank one mean the same thing, and only one of them should reach a query.
 */
function normalizeValue(raw: string | null): string | undefined {
  if (raw === null) return undefined

  const trimmed = raw.trim()
  if (trimmed === '') return undefined

  return trimmed.slice(0, MAX_ATTRIBUTION_VALUE_LENGTH)
}

/**
 * A same-origin referrer is navigation within our own site, which tells us
 * nothing about where the visitor came from -- recording it would overwrite
 * the real source the moment someone clicks through to `/book`.
 */
function normalizeReferrer(referrer: string, origin: string): string | undefined {
  const value = normalizeValue(referrer)
  if (value === undefined) return undefined

  try {
    if (new URL(value).origin === origin) return undefined
  } catch {
    return undefined
  }

  return value
}

export interface ParseAttributionInput {
  /** The query string, with or without its leading `?`. */
  readonly search: string
  /** `document.referrer`, or `''`. */
  readonly referrer?: string
  /** Our own origin, used to discard same-site referrers. */
  readonly origin?: string
  /** Path the visitor landed on. */
  readonly landingPath?: string
  /** Epoch milliseconds. Injected so tests are not clock-dependent. */
  readonly now?: number
}

/**
 * Builds an `Attribution` from a landing URL. Pure -- no `window`, no
 * storage, no clock unless one is passed.
 */
export function parseAttribution(input: ParseAttributionInput): Attribution {
  const params = new URLSearchParams(input.search)

  const captured: Record<string, unknown> = {}

  for (const [param, field] of Object.entries(PARAM_MAP)) {
    const value = normalizeValue(params.get(param))
    if (value !== undefined) captured[field] = value
  }

  const referrer =
    input.referrer !== undefined && input.origin !== undefined
      ? normalizeReferrer(input.referrer, input.origin)
      : undefined
  if (referrer !== undefined) captured.referrer = referrer

  const landingPath = normalizeValue(input.landingPath ?? null)
  if (landingPath !== undefined) captured.landingPath = landingPath

  captured.capturedAt = input.now ?? Date.now()

  return captured as Attribution
}

/**
 * True when a parsed attribution carries nothing but its timestamp -- a
 * direct visit with no campaign and no usable referrer.
 *
 * This is what stops an internal click-through from erasing the campaign
 * that actually brought the visitor in: an empty last-touch is not written.
 */
export function isEmptyAttribution(attribution: Attribution): boolean {
  return Object.keys(attribution).every((key) => key === 'capturedAt')
}

function readStored(): StoredAttribution | null {
  if (!isBrowser()) return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null

    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null

    const { firstTouch, lastTouch } = parsed as Partial<StoredAttribution>
    if (typeof firstTouch !== 'object' || firstTouch === null) return null
    if (typeof lastTouch !== 'object' || lastTouch === null) return null

    return { firstTouch, lastTouch }
  } catch {
    // Unavailable storage (Safari private mode throws on property access,
    // not just on getItem) or a hand-edited value. Same handling as
    // analytics/consent.ts: fall back to "nothing stored".
    return null
  }
}

function writeStored(value: StoredAttribution): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Attribution simply does not survive the reload. Never crash the page
    // over it -- the visitor is on their way to book an appointment.
  }
}

/**
 * Merges a freshly parsed attribution into what is already stored and
 * returns both touches.
 *
 * First touch is written once and never overwritten: it is the campaign
 * that earned the relationship, and a dental practice's booking cycle can
 * run for weeks across several visits. Last touch is overwritten on every
 * visit that carries real attribution, so the two together answer both
 * "what introduced them" and "what closed them".
 */
export function recordAttribution(attribution: Attribution): StoredAttribution {
  const stored = readStored()

  if (stored === null) {
    const seeded: StoredAttribution = { firstTouch: attribution, lastTouch: attribution }
    writeStored(seeded)
    return seeded
  }

  if (isEmptyAttribution(attribution)) return stored

  const updated: StoredAttribution = { firstTouch: stored.firstTouch, lastTouch: attribution }
  writeStored(updated)
  return updated
}

/** Reads both touches without recording a new one. Empty when nothing is stored. */
export function getAttribution(): StoredAttribution {
  return readStored() ?? { firstTouch: {}, lastTouch: {} }
}
