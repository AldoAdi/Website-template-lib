'use client'

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { buildBookingUrl } from './buildBookingUrl'
import { getAttribution } from './attribution'
import { getBookingSinks } from './config'
import { getSessionId, getVisitorId } from './ids'
import { recordBookingStep } from './recordStep'
import type { BookingSink } from './sink'

/**
 * Long enough for a queued beacon to leave, short enough that nobody reads
 * the interstitial as a broken page.
 *
 * This delay is not decoration. `sendBeacon` is queued synchronously and
 * survives unload, but gtag's own transport is not guaranteed to be, and a
 * cross-origin `location.replace` fired in the same tick can cut it off --
 * losing the single event the whole module exists to capture.
 */
export const DEFAULT_REDIRECT_DELAY_MS = 400

export interface BookingRedirectProps {
  /** The third-party scheduler URL. */
  readonly providerUrl: string
  /** Defaults to the app-wide sinks. Sinks cannot be passed from a server component -- see `config.ts`. */
  readonly sinks?: readonly BookingSink[]
  /** Forward last-touch `utm_*` to the scheduler. Off unless the vendor has confirmed what it does with them. */
  readonly forwardUtm?: boolean
  readonly heading?: string
  readonly body?: string
  /** Shown under the message -- a phone number belongs here, so a failed redirect still converts. */
  readonly fallback?: ReactNode
  readonly redirectDelayMs?: number
  readonly className?: string
}

const WRAPPER_CLASSES =
  'bg-background text-foreground flex min-h-[60vh] flex-col items-center justify-center gap-4 px-gutter py-16 text-center'

const LINK_CLASSES = 'text-primary underline underline-offset-4'

/**
 * The first-party interstitial that owns the booking handoff.
 *
 * Everything about a booking click that we can measure happens here,
 * because it is the last moment we control before the visitor is on a
 * domain we do not own.
 *
 * Two rules this component will not break:
 *
 * 1. **The redirect never waits on consent.** Someone who rejected the
 *    cookie banner still came here to book an appointment. They are sent to
 *    the scheduler exactly like everyone else; they are simply not
 *    recorded. Measurement is our problem, not theirs.
 * 2. **The redirect never waits on a sink.** Emission is synchronous and
 *    failure-swallowing, and the timer runs regardless.
 *
 * Renders a real message rather than a blank flash, both because the delay
 * above needs somewhere to live and because it gives the phone number a
 * home for the case where the redirect fails entirely.
 */
export function BookingRedirect({
  providerUrl,
  sinks,
  forwardUtm,
  heading = 'Taking you to booking…',
  body = 'One moment while we open the appointment scheduler.',
  fallback,
  redirectDelayMs = DEFAULT_REDIRECT_DELAY_MS,
  className,
}: BookingRedirectProps): ReactElement {
  const hasRun = useRef(false)
  const [destination, setDestination] = useState<string | null>(null)
  const activeSinks = sinks ?? getBookingSinks()

  useEffect(() => {
    // React StrictMode runs effects twice in development. Without this
    // guard the funnel would report two handoffs for every real one, and
    // the bug would only exist in dev -- the worst kind to chase.
    if (hasRun.current) return
    hasRun.current = true

    recordBookingStep('booking_view', activeSinks, { captureFromUrl: true })

    const url = buildBookingUrl({
      providerUrl,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      lastTouch: getAttribution().lastTouch,
      ...(forwardUtm !== undefined ? { forwardUtm } : {}),
    })
    setDestination(url)

    recordBookingStep('booking_handoff', activeSinks)

    // `replace`, not `assign`: the interstitial must not sit in history, or
    // Back from the scheduler bounces the visitor straight into it again.
    const timer = window.setTimeout(() => {
      window.location.replace(url)
    }, redirectDelayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [providerUrl, activeSinks, forwardUtm, redirectDelayMs])

  const classes = className ? `${WRAPPER_CLASSES} ${className}` : WRAPPER_CLASSES

  return (
    <div className={classes}>
      {/* The visitor is mid-navigation and nothing here is focusable, so a
          screen reader needs to be told the page is working rather than stuck. */}
      <p role="status" aria-live="polite" className="text-2xl font-semibold tracking-tight">
        {heading}
      </p>
      <p className="text-muted-foreground max-w-prose">{body}</p>

      {/* Also the no-JS path: without scripts the effect never runs, and
          this stays the only way through. */}
      <a href={destination ?? providerUrl} className={LINK_CLASSES}>
        Continue to booking
      </a>

      {fallback}
    </div>
  )
}
