'use client'

import type { ReactElement } from 'react'
import Link from 'next/link'
import { useConsentState } from '../analytics/useConsentState'
import { CallLink } from './CallLink'

export interface StickyCallBarProps {
  readonly phone: string
  /** The site's own booking route -- never the third-party scheduler URL. */
  readonly bookHref: string
  /** Defaults to `'Call'`. Keep it short: the bar is two buttons on a 360px screen. */
  readonly callLabel?: string
  /** Defaults to `'Book'`. */
  readonly bookLabel?: string
  /** Recorded as the CTA placement for both buttons. Defaults to `'sticky-bar'`. */
  readonly location?: string
  readonly className?: string
}

const BAR_CLASSES =
  'border-border bg-background fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t px-gutter py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden'

const BUTTON_BASE =
  'inline-flex flex-1 items-center justify-center rounded-md px-4 py-3 text-sm font-semibold'

const CALL_CLASSES = `${BUTTON_BASE} bg-primary text-primary-foreground`
const BOOK_CLASSES = `${BUTTON_BASE} border-border text-foreground border`

/**
 * A two-button action bar pinned to the bottom of small screens: call, or
 * book.
 *
 * Why it exists: on a local service business most traffic is a phone held in
 * one hand, and the visitor's question is answered somewhere in the middle
 * of the page -- nowhere near the hero button they scrolled past. The bar
 * makes the decision actionable at the moment it is made rather than after a
 * scroll back to the top.
 *
 * **It yields to the consent banner.** `CookieBanner` is also
 * `fixed inset-x-0 bottom-0`, so a bar rendered underneath it would either
 * be buried or would bury the Accept and Reject buttons. Burying those is
 * the worse failure and not an obvious one: consent can never be granted,
 * so no event ever fires, and the funnel looks broken rather than blocked.
 * So this renders nothing at all while the decision is outstanding, and
 * appears the moment one is made -- either way. A denial hides the tracking,
 * not the phone number.
 *
 * Hidden from `md` up, where the header keeps both actions in view anyway.
 */
export function StickyCallBar({
  phone,
  bookHref,
  callLabel = 'Call',
  bookLabel = 'Book',
  location = 'sticky-bar',
  className,
}: StickyCallBarProps): ReactElement | null {
  const consentState = useConsentState()

  if (consentState === 'unknown') return null

  const classes = className ? `${BAR_CLASSES} ${className}` : BAR_CLASSES

  return (
    <>
      {/* Occupies the height the fixed bar covers, so the end of the page --
          usually the footer's contact details -- is not permanently hidden
          behind it. In normal flow, so it costs nothing on desktop where the
          bar itself is display:none. */}
      <div aria-hidden="true" className="h-20 md:hidden" />
      <div role="region" aria-label="Contact actions" className={classes}>
        <CallLink phone={phone} location={location} className={CALL_CLASSES}>
          {callLabel}
        </CallLink>
        <Link href={bookHref} className={BOOK_CLASSES}>
          {bookLabel}
        </Link>
      </div>
    </>
  )
}
