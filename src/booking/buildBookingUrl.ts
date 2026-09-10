import type { Attribution } from './types'

/**
 * Builds the outbound URL for the third-party scheduler.
 *
 * Pure, and separate from the component that navigates, because this is
 * the piece most likely to change: which parameters a given scheduler
 * accepts is a fact about that vendor, discovered by asking them. Keeping
 * it here means swapping vendors is one function and its tests.
 */

/** Carries our session id across the handoff, so a vendor callback can be stitched back. */
export const SESSION_PARAM = 'bk_sid'
/** Carries the visitor id, for stitching a return visit that starts at the vendor. */
export const VISITOR_PARAM = 'bk_vid'

/**
 * Last-touch fields forwarded to the vendor, under their conventional
 * names. Only last touch: this describes the click that is converting
 * right now, which is what a vendor-side report would be reconciled
 * against.
 */
const FORWARDED: readonly (readonly [keyof Attribution, string])[] = [
  ['utmSource', 'utm_source'],
  ['utmMedium', 'utm_medium'],
  ['utmCampaign', 'utm_campaign'],
  ['utmTerm', 'utm_term'],
  ['utmContent', 'utm_content'],
]

export interface BuildBookingUrlInput {
  /** The scheduler URL, which may already carry its own query string. */
  readonly providerUrl: string
  readonly visitorId: string
  readonly sessionId: string
  readonly lastTouch?: Attribution
  /**
   * Whether to append `utm_*` to the outbound URL. Defaults to `false`.
   *
   * Off by default because many schedulers echo unknown parameters into
   * their own analytics or, worse, into a confirmation email. Turn it on
   * once the vendor has confirmed what they do with them.
   */
  readonly forwardUtm?: boolean
}

/**
 * Appends our ids (and optionally the last-touch campaign) to the provider
 * URL, preserving any query the provider URL already carries.
 *
 * Returns the input untouched if it is not a parsable absolute URL --
 * a misconfigured `NEXT_PUBLIC_BOOKING_URL` should still send the visitor
 * somewhere rather than throwing on the way to the scheduler.
 */
export function buildBookingUrl(input: BuildBookingUrlInput): string {
  let url: URL

  try {
    url = new URL(input.providerUrl)
  } catch {
    return input.providerUrl
  }

  url.searchParams.set(SESSION_PARAM, input.sessionId)
  url.searchParams.set(VISITOR_PARAM, input.visitorId)

  if (input.forwardUtm === true && input.lastTouch !== undefined) {
    for (const [field, param] of FORWARDED) {
      const value = input.lastTouch[field]
      if (typeof value === 'string' && value !== '') url.searchParams.set(param, value)
    }
  }

  return url.toString()
}
