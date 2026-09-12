'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

export interface CarouselProps {
  /** One entry per slide. Each is wrapped in a snap-aligned list item. */
  readonly items: readonly ReactNode[]
  /** Names the carousel for assistive technology, e.g. `'Patient reviews'`. */
  readonly label: string
  /**
   * Slides visible at once from `md` up. Defaults to 3. Below `md` it is
   * always roughly one-and-a-bit, so the half-visible next slide tells the
   * visitor there is more.
   */
  readonly visible?: 2 | 3 | 4
  /** Defaults to `'Previous'` / `'Next'`. */
  readonly previousLabel?: string
  readonly nextLabel?: string
  readonly className?: string
}

const TRACK_CLASSES =
  'flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

const BUTTON_CLASSES =
  'border-border bg-background text-foreground hover:bg-secondary disabled:opacity-40 inline-flex size-9 items-center justify-center rounded-full border text-sm'

const BASIS_BY_VISIBLE: Record<2 | 3 | 4, string> = {
  2: 'basis-[85%] sm:basis-1/2',
  3: 'basis-[85%] sm:basis-1/2 lg:basis-1/3',
  4: 'basis-[85%] sm:basis-1/2 lg:basis-1/4',
}

// How close to an end counts as "at the end". Sub-pixel layout and
// fractional zoom mean scrollLeft rarely lands exactly on the maximum, so
// an equality check would leave the Next button enabled forever.
const EDGE_TOLERANCE_PX = 4

/**
 * A horizontally scrolling row of slides, built on CSS scroll snap.
 *
 * There is no carousel library here and no autoplay. The scroller is a real
 * overflow container, so a trackpad, a touch swipe, shift+wheel, and the
 * arrow keys all work with no code; the buttons only call `scrollBy`. That
 * is the entire implementation, and it is why this survives with JavaScript
 * still loading -- the slides are readable and scrollable either way.
 *
 * Accessibility notes, all of them load-bearing:
 * - The track is `tabIndex={0}` with a role and name. A scrollable region
 *   that cannot be reached by keyboard is a WCAG 2.1 failure, and a
 *   `div` that scrolls is not focusable by default.
 * - Slides are a real `<ul>`/`<li>`, so the count is announced. The track
 *   keeps its list role and is merely *named* with `aria-label`; giving it
 *   `role="group"` instead would strip the list role and orphan every
 *   `<li>` inside it. There is likewise no `aria-roledescription="carousel"`,
 *   because nothing here behaves like the ARIA carousel pattern and claiming
 *   the role without the rotation controls it implies helps nobody.
 * - The buttons are `aria-hidden` shortcuts, not the only way to move: a
 *   screen reader user tabs through the slides themselves.
 * - `scroll-smooth` is dropped under `motion-reduce`.
 *
 * ponytail: no dots, no autoplay, no drag-with-momentum. Reviews are read,
 * not watched; add them if a slide ever needs to be found by index.
 */
export function Carousel({
  items,
  label,
  visible = 3,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  className,
}: CarouselProps): ReactElement {
  const trackRef = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const syncEdges = useCallback((): void => {
    const track = trackRef.current
    if (!track) return

    const maxScroll = track.scrollWidth - track.clientWidth
    setAtStart(track.scrollLeft <= EDGE_TOLERANCE_PX)
    // A track that does not overflow has maxScroll 0, which reads as both
    // ends at once -- correct, and it disables both buttons.
    setAtEnd(track.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX)
  }, [])

  useEffect(() => {
    syncEdges()

    const track = trackRef.current
    if (!track) return undefined

    // ResizeObserver as well as scroll: a rotation or a font load changes
    // whether the track overflows at all, and the buttons must follow.
    const observer = new ResizeObserver(syncEdges)
    observer.observe(track)

    return () => observer.disconnect()
  }, [syncEdges, items])

  function scrollByPage(direction: -1 | 1): void {
    const track = trackRef.current
    if (!track) return

    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={className}>
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={label}
        className={TRACK_CLASSES}
        onScroll={syncEdges}
      >
        {items.map((item, index) => (
          <li key={index} className={`shrink-0 snap-start ${BASIS_BY_VISIBLE[visible]}`}>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className={BUTTON_CLASSES}
          aria-label={previousLabel}
          disabled={atStart}
          onClick={() => scrollByPage(-1)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          className={BUTTON_CLASSES}
          aria-label={nextLabel}
          disabled={atEnd}
          onClick={() => scrollByPage(1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}
