'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

export interface RevealProps {
  readonly children: ReactNode
  /** Milliseconds of stagger, for revealing a row of cards in sequence. Defaults to 0. */
  readonly delayMs?: number
  /** Element to render. Defaults to `'div'`. */
  readonly as?: 'div' | 'section' | 'li' | 'span'
  readonly className?: string
}

const TRANSITION_CLASSES = 'transition-[opacity,transform] duration-700 ease-out'

const HIDDEN_CLASSES = 'translate-y-4 opacity-0'

// Start the reveal slightly before the element reaches the viewport, so the
// animation is finishing as it arrives rather than starting once it is
// already being read.
const ROOT_MARGIN = '0px 0px -10% 0px'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Fades and lifts its children into view once, when they first scroll near
 * the viewport.
 *
 * Three rules it follows that most scroll-animation code does not:
 *
 * 1. **It renders visible.** The hidden state is applied in an effect, not
 *    in the initial markup. With JavaScript blocked, failed, or still
 *    loading, the page is a normal readable page; there is no class sitting
 *    in the HTML that can strand content at `opacity: 0` forever. This is
 *    the failure mode that takes whole marketing sites blank, and it is not
 *    hypothetical.
 * 2. **It checks whether the element is already on screen** before hiding
 *    it, so above-the-fold content never flashes out and back in.
 * 3. **It obeys `prefers-reduced-motion`** by doing nothing at all --
 *    vestibular triggers are not a style preference.
 *
 * It also disconnects after the first reveal. Content that re-hides itself
 * when scrolled past is a distraction on a page someone is trying to read.
 */
export function Reveal({
  children,
  delayMs = 0,
  as: Element = 'div',
  className,
}: RevealProps): ReactElement {
  const ref = useRef<HTMLElement>(null)
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined

    const rect = node.getBoundingClientRect()
    const isOnScreen = rect.top < window.innerHeight && rect.bottom > 0
    if (isOnScreen) return undefined

    setIsHidden(true)

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return

        setIsHidden(false)
        observer.disconnect()
      },
      { rootMargin: ROOT_MARGIN },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const classes = [TRANSITION_CLASSES, isHidden ? HIDDEN_CLASSES : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <Element
      ref={ref as React.Ref<never>}
      className={classes}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Element>
  )
}
