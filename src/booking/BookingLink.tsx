'use client'

import type { MouseEvent, ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import { recordBookingStep } from './recordStep'
import type { BookingSink } from './sink'

export interface BookingLinkProps {
  /** The first-party booking route. Never the third-party scheduler URL -- that is `BookingRedirect`'s job. */
  readonly href: string
  /** Where this CTA sits on the page, e.g. `'hero'`. Recorded so the funnel can rank CTA placements. */
  readonly location: string
  readonly sinks: readonly BookingSink[]
  readonly children: ReactNode
  readonly className?: string
}

/**
 * A booking CTA that records the click before following the link.
 *
 * The library already exports `track()` but no component has ever called
 * it, so every CTA in every site built on this template has been silent.
 * This is the wrapper that closes that gap for the one click that matters.
 *
 * `href` must point at the site's own booking route. Pointing it straight
 * at the scheduler would record the click and then hand the visitor
 * off-domain in the same breath, which is the situation this module exists
 * to end -- once an external URL is printed on an ad, a business card, or a
 * Google Business Profile, it cannot be changed. A first-party route can.
 *
 * Navigation is never blocked or delayed: recording is best-effort and
 * synchronous, and `emitBookingEvent` swallows sink failures, so a visitor
 * always reaches the booking page.
 */
export function BookingLink({
  href,
  location,
  sinks,
  children,
  className,
}: BookingLinkProps): ReactElement {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    // A modified click opens a new tab and leaves this page alive, so the
    // visitor has not begun the funnel here -- recording it would inflate
    // cta_click against the booking_view that never follows in this tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    recordBookingStep('cta_click', sinks, { location })
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
