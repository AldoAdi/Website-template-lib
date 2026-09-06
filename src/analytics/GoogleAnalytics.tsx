'use client'

import { useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'
import { getConsentState, onConsentChange } from './consent'
import type { ConsentState } from './consent'
import { getGaId } from './gtag'

// useSyncExternalStore's subscribe contract takes a no-argument callback --
// it only needs to know "something changed" before re-invoking the
// snapshot getter itself. `onConsentChange` is the module's general
// pub/sub API and passes the new state to its listener; this adapter just
// ignores that argument. Same pattern as CookieBanner.tsx.
function subscribe(onStoreChange: () => void): () => void {
  return onConsentChange(() => onStoreChange())
}

// The server cannot know the visitor's stored decision, so both the server
// render and the client's first paint report 'unknown' (script withheld);
// the real state swaps in a moment later as a state update, not a
// server/client markup disagreement, so no hydration mismatch.
function getServerSnapshot(): ConsentState {
  return 'unknown'
}

function useConsentState(): ConsentState {
  return useSyncExternalStore(subscribe, getConsentState, getServerSnapshot)
}

export interface GoogleAnalyticsProps {
  /** Overrides the measurement ID; defaults to `NEXT_PUBLIC_GA_ID`. */
  readonly gaId?: string
}

/**
 * Thin wrapper over `@next/third-parties`'s `GoogleAnalytics`. Renders
 * nothing until consent is granted -- SPEC.md: "Never fire an analytics
 * event before consent is granted," and the GA bootstrap script itself
 * counts as firing one -- and nothing at all when no measurement ID is
 * configured (see `getGaId` for the once-only production warning).
 *
 * `@next/third-parties`'s component only ever injects `next/script` tags
 * client-side; it needs no server API, so it works unchanged under
 * `output: 'export'` (SPEC.md Deploy Targets).
 */
export function GoogleAnalytics({ gaId }: GoogleAnalyticsProps = {}): ReactElement | null {
  const consentState = useConsentState()
  const resolvedGaId = gaId ?? getGaId()

  if (!resolvedGaId) return null
  if (consentState !== 'granted') return null

  return <NextGoogleAnalytics gaId={resolvedGaId} />
}
