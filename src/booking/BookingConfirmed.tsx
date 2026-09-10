'use client'

import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { recordBookingStep } from './recordStep'
import type { BookingSink } from './sink'

export interface BookingConfirmedProps {
  readonly sinks: readonly BookingSink[]
  readonly children: ReactNode
}

/**
 * Records `booking_confirmed` when the scheduler sends the visitor back.
 *
 * This is the only component here that depends on something outside our
 * control: the vendor has to support a post-booking redirect (or a
 * "thank you" URL) pointing at a route that renders this. Ask them before
 * relying on it.
 *
 * Without that redirect the funnel measures booking *intent* and stops
 * there -- everything past the handoff is a modelled estimate, not an
 * observation, and it should be labelled that way in any report. With it,
 * the loop closes and `booking_confirmed` becomes a real conversion to
 * optimise ad spend against.
 *
 * The visitor's ids come from their own cookies, which survived the round
 * trip, so the confirmation stitches to the handoff without the vendor
 * having to pass anything back.
 */
export function BookingConfirmed({ sinks, children }: BookingConfirmedProps): ReactElement {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    recordBookingStep('booking_confirmed', sinks)
  }, [sinks])

  return <>{children}</>
}
