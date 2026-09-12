'use client'

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

export interface ScrollToTopProps {
  /** Pixels scrolled before the button appears. Defaults to 600 -- roughly one viewport. */
  readonly showAfterPx?: number
  /** Accessible name. Defaults to `'Scroll to top'`. */
  readonly label?: string
  readonly className?: string
}

const DEFAULT_SHOW_AFTER_PX = 600

// `bottom-24` on small screens clears `StickyCallBar`, which occupies the
// bottom edge there; from `md` up that bar is gone and the button drops to
// the corner.
const BUTTON_CLASSES =
  'border-border bg-background text-foreground hover:bg-secondary fixed right-4 bottom-24 z-30 inline-flex size-11 items-center justify-center rounded-full border shadow-md md:bottom-6'

/**
 * A back-to-top button, shown only once there is something to go back up
 * from.
 *
 * Worth its ~40 lines on exactly the kind of page this library builds: a
 * long single-page site whose booking action lives at the top. Without it,
 * the visitor who has finished reading has to flick-scroll past eight
 * sections to act on what they just read.
 *
 * Rendered `null` until the threshold is crossed rather than faded in, so
 * it is never a hidden tab stop sitting over the content. The scroll
 * respects `prefers-reduced-motion`: a full-page smooth scroll is one of
 * the strongest vestibular triggers there is.
 */
export function ScrollToTop({
  showAfterPx = DEFAULT_SHOW_AFTER_PX,
  label = 'Scroll to top',
  className,
}: ScrollToTopProps): ReactElement | null {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    function onScroll(): void {
      setIsVisible(window.scrollY > showAfterPx)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [showAfterPx])

  if (!isVisible) return null

  function scrollToTop(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={scrollToTop}
      className={className ? `${BUTTON_CLASSES} ${className}` : BUTTON_CLASSES}
    >
      <span aria-hidden="true">↑</span>
    </button>
  )
}
