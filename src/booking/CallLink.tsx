'use client'

import type { MouseEvent, ReactElement, ReactNode } from 'react'
import { getBookingSinks } from './config'
import { recordBookingStep } from './recordStep'
import type { BookingSink } from './sink'
import { toTelHref } from './tel'

export interface CallLinkProps {
  /** The number as it should be dialled and, by default, as it should read. */
  readonly phone: string
  /** Where this link sits on the page, e.g. `'header'`. Recorded so the funnel can rank placements. */
  readonly location: string
  /** Defaults to the app-wide sinks. Sinks cannot be passed from a server component -- see `config.ts`. */
  readonly sinks?: readonly BookingSink[]
  /** Defaults to the `phone` string, so the number is visible unless deliberately replaced. */
  readonly children?: ReactNode
  readonly className?: string
}

/**
 * A phone link that records the click before the dialler opens.
 *
 * This is the other half of the funnel, and on a local service business it
 * is frequently the larger half. Everything else in this module exists
 * because a booking handed off to a third-party scheduler is invisible to
 * our tags -- but a phone call is *more* invisible still, and it had been
 * going entirely uncounted. A site that measures only its booking button
 * will report a fraction of its conversions and then conclude, wrongly,
 * that the channel driving the calls is not working.
 *
 * A `tel:` navigation does not unload the page on desktop and only
 * sometimes does on mobile, so recording is fire-and-forget through the
 * same sinks as every other step: `createGaSink` already routes through
 * `track()`, and `createHttpSink` already uses `sendBeacon`, which is
 * specified to survive exactly this kind of departure.
 *
 * What this cannot see is the other end of the call. `call_click` means a
 * dialler opened, not that anyone answered -- see the note on the step
 * itself in `types.ts`.
 */
export function CallLink({
  phone,
  location,
  sinks,
  children,
  className,
}: CallLinkProps): ReactElement {
  const activeSinks = sinks ?? getBookingSinks()

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    // Matches BookingLink: a modified click does not begin the funnel in
    // this tab, so recording it would inflate the step against a journey
    // that continues somewhere else.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    recordBookingStep('call_click', activeSinks, { location })
  }

  return (
    <a href={toTelHref(phone)} className={className} onClick={handleClick}>
      {children ?? phone}
    </a>
  )
}
