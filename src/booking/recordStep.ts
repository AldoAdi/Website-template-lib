import { getAttribution, parseAttribution, recordAttribution } from './attribution'
import { getSessionId, getVisitorId } from './ids'
import { emitBookingEvent, type BookingSink } from './sink'
import type { BookingEvent, BookingStep } from './types'

/**
 * The one call site that turns "something happened" into a fully-formed
 * `BookingEvent`: mint or read the ids, resolve both attribution touches,
 * stamp the time, fan out to the sinks.
 *
 * Kept out of the components so both `BookingLink` and `BookingRedirect`
 * emit identically-shaped events, and so a consumer can record a step from
 * somewhere the library does not ship a component for.
 */

export interface RecordStepOptions {
  /** Where on the page the CTA sat. Only meaningful for `cta_click`. */
  readonly location?: string
  /**
   * Capture attribution from the current URL before emitting, rather than
   * only reading what is already stored. Set on the booking route, which is
   * where an ad click actually lands.
   */
  readonly captureFromUrl?: boolean
}

export function recordBookingStep(
  step: BookingStep,
  sinks: readonly BookingSink[],
  options: RecordStepOptions = {},
): BookingEvent {
  const touches =
    options.captureFromUrl === true && typeof window !== 'undefined'
      ? recordAttribution(
          parseAttribution({
            search: window.location.search,
            referrer: document.referrer,
            origin: window.location.origin,
            landingPath: window.location.pathname,
          }),
        )
      : getAttribution()

  const event: BookingEvent = {
    step,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    at: Date.now(),
    firstTouch: touches.firstTouch,
    lastTouch: touches.lastTouch,
    ...(options.location !== undefined ? { location: options.location } : {}),
  }

  emitBookingEvent(event, sinks)

  return event
}
