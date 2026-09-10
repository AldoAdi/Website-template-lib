import { hasConsent, track } from '../analytics'
import type { BookingEvent } from './types'

/**
 * Where funnel events go.
 *
 * The whole point of this indirection is that the "do we need our own
 * database?" question does not have to be answered before the funnel is
 * measurable. `createGaSink` ships today and needs no infrastructure;
 * adding `createHttpSink` later is one line at the call site, not a
 * rewrite, because everything upstream -- the route, the cookies, the
 * attribution capture, the redirect -- is identical either way.
 */
export interface BookingSink {
  /** Identifies the sink in the console when it misbehaves. */
  readonly name: string
  /** Fire-and-forget. Must never throw and must never block navigation. */
  emit(event: BookingEvent): void
}

/**
 * Flattens an event for transports that only accept scalars (gtag being
 * the one that matters). Nested touch objects become prefixed keys, and
 * `undefined` fields are dropped rather than sent as the string
 * `"undefined"`.
 */
export function toFlatProps(event: BookingEvent): Readonly<Record<string, unknown>> {
  const flat: Record<string, unknown> = {
    booking_step: event.step,
    visitor_id: event.visitorId,
    session_id: event.sessionId,
  }

  if (event.location !== undefined) flat.cta_location = event.location

  for (const [key, value] of Object.entries(event.firstTouch)) {
    if (value !== undefined) flat[`first_${key}`] = value
  }

  for (const [key, value] of Object.entries(event.lastTouch)) {
    if (value !== undefined) flat[`last_${key}`] = value
  }

  return flat
}

/**
 * Sends events to GA4 through the library's existing `track()`.
 *
 * Deliberately built on `track()` rather than calling `gtag` directly, so
 * it inherits the consent gate and the pre-consent queue for free -- an
 * event fired before the banner is answered is held and flushed on grant,
 * exactly like every other event in the library.
 */
export function createGaSink(): BookingSink {
  return {
    name: 'ga',
    emit(event: BookingEvent): void {
      track(event.step, toFlatProps(event))
    },
  }
}

export interface HttpSinkOptions {
  /**
   * Whether to hold events until consent is granted. Defaults to `true`,
   * matching SPEC.md Boundaries: "no beacon fires before opt-in."
   *
   * Setting this to `false` is a legal decision, not a technical one. It is
   * defensible for a first-party endpoint that stores no PII under a
   * regime where anonymous first-party measurement does not require opt-in;
   * it is not defensible under GDPR without advice. Whoever sets it should
   * say why at the call site.
   */
  readonly requiresConsent?: boolean
}

/**
 * Posts events to a first-party endpoint -- the sink to reach for once
 * there is a database behind `./booking/server`.
 *
 * Uses `sendBeacon`, not `fetch`, because the very next thing that happens
 * after a `booking_handoff` is a cross-origin navigation that tears down
 * the page. A beacon is queued by the browser and survives unload; an
 * in-flight `fetch` is cancelled, which would lose precisely the event the
 * funnel is built to capture.
 */
export function createHttpSink(endpoint: string, options: HttpSinkOptions = {}): BookingSink {
  const requiresConsent = options.requiresConsent ?? true

  return {
    name: 'http',
    emit(event: BookingEvent): void {
      if (requiresConsent && !hasConsent()) return
      if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return

      const body = new Blob([JSON.stringify(event)], { type: 'application/json' })
      navigator.sendBeacon(endpoint, body)
    },
  }
}

export interface MemorySink extends BookingSink {
  readonly events: readonly BookingEvent[]
}

/** Collects events in memory. For tests and local development. */
export function createMemorySink(): MemorySink {
  let events: readonly BookingEvent[] = []

  return {
    name: 'memory',
    emit(event: BookingEvent): void {
      events = [...events, event]
    },
    get events(): readonly BookingEvent[] {
      return events
    },
  }
}

/**
 * Fans an event out to every sink, isolating each one.
 *
 * A sink that throws must not stop the sinks after it and must not reach
 * the page. SPEC.md: "Analytics never throws into the page." Here that
 * matters twice over -- this runs microseconds before a redirect, and a
 * thrown error would strand a visitor who was trying to book.
 */
export function emitBookingEvent(event: BookingEvent, sinks: readonly BookingSink[]): void {
  for (const sink of sinks) {
    try {
      sink.emit(event)
    } catch (error) {
      console.error(`[booking] sink "${sink.name}" failed on "${event.step}":`, error)
    }
  }
}
