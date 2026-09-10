'use client'

import { useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { GoogleTagManager as NextGoogleTagManager } from '@next/third-parties/google'
import { getConsentState, onConsentChange } from './consent'
import type { ConsentState } from './consent'
import { getGtmId } from './dataLayer'

function subscribe(onStoreChange: () => void): () => void {
  return onConsentChange(() => onStoreChange())
}

function getServerSnapshot(): ConsentState {
  return 'unknown'
}

function useConsentState(): ConsentState {
  return useSyncExternalStore(subscribe, getConsentState, getServerSnapshot)
}

export interface GoogleTagManagerProps {
  /** Overrides the container ID; defaults to `NEXT_PUBLIC_GTM_ID`. */
  readonly gtmId?: string
}

/**
 * Thin wrapper over `@next/third-parties`'s `GoogleTagManager`, gated on
 * consent exactly like `GoogleAnalytics` -- the container bootstrap is
 * itself a beacon, so it may not load before opt-in.
 *
 * Withholding the container until consent means events fired earlier would
 * be lost, which is why `track()` queues them (see `index.ts`): the queue
 * flushes on grant, into a dataLayer the container then replays.
 *
 * Render this **or** `GoogleAnalytics`, never both. GTM's own GA4
 * Configuration tag is what sends to GA4 when a container is in play;
 * loading the direct GA4 script alongside it double-counts every event.
 */
export function GoogleTagManager({ gtmId }: GoogleTagManagerProps = {}): ReactElement | null {
  const consentState = useConsentState()
  const resolvedGtmId = gtmId ?? getGtmId()

  if (!resolvedGtmId) return null
  if (consentState !== 'granted') return null

  return <NextGoogleTagManager gtmId={resolvedGtmId} />
}
