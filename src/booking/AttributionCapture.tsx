'use client'

import { useEffect, useRef, type ReactElement } from 'react'
import { parseAttribution, recordAttribution } from './attribution'

/**
 * Records where the visitor came from, on every page.
 *
 * Mount it once in the root layout. Without it, attribution is only read
 * when a funnel step fires -- which means an ad click landing on the
 * homepage is captured only if the visitor reaches a booking CTA, and is
 * lost entirely if they read a services page first and the `gclid` has
 * scrolled out of the URL by then.
 *
 * Cheap and idempotent: a URL carrying no campaign parameters parses as
 * empty and leaves the stored touches alone, so this never overwrites a
 * real campaign with an internal navigation.
 */
export function AttributionCapture(): ReactElement | null {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    recordAttribution(
      parseAttribution({
        search: window.location.search,
        referrer: document.referrer,
        origin: window.location.origin,
        landingPath: window.location.pathname,
      }),
    )
  }, [])

  return null
}
