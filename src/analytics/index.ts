// Reached via the "./analytics" subpath. Consent is the gate everything
// here sits behind -- see SPEC.md Boundaries: "Never fire an analytics
// event before consent is granted."
import type { TrackEvent } from './types'
import { hasConsent, onConsentChange } from './consent'
import { getGaId, gtagEvent } from './gtag'

export { getConsentState, hasConsent, grantConsent, denyConsent, onConsentChange } from './consent'
export type { ConsentState, ConsentListener } from './consent'
export type { TrackEvent } from './types'
export { GoogleAnalytics } from './GoogleAnalytics'
export type { GoogleAnalyticsProps } from './GoogleAnalytics'

/** Oldest events are dropped first once the pre-consent queue is full. */
export const MAX_QUEUED_EVENTS = 50

let queue: readonly TrackEvent[] = []

function flushQueue(): void {
  const pending = queue
  queue = []
  for (const event of pending) send(event)
}

// Auto-wires the queue to consent the moment this module is first imported
// anywhere in the app: the instant a visitor grants consent, anything
// gathered before that moment flushes, in order, exactly once. Callers do
// not need to remember a separate "start analytics" step for this to work.
onConsentChange((state) => {
  if (state === 'granted') flushQueue()
})

/**
 * Re-subscribes the queue-flush listener and returns an unsubscribe
 * function. The module already wires this on import (above); this export
 * exists for a caller that wants its own explicit lifecycle -- e.g.
 * unsubscribing when a specific component unmounts -- rather than relying
 * on the always-on module-level subscription.
 */
export function initAnalytics(): () => void {
  return onConsentChange((state) => {
    if (state === 'granted') flushQueue()
  })
}

/**
 * Records a product event. Sent immediately when consent is already
 * granted; queued otherwise (oldest dropped past `MAX_QUEUED_EVENTS`), so
 * nothing is ever lost silently and nothing is ever sent without
 * permission.
 */
export function track(name: string, props: Readonly<Record<string, unknown>> = {}): void {
  const event: TrackEvent = { name, props, at: Date.now() }

  if (!hasConsent()) {
    queue = [...queue, event].slice(-MAX_QUEUED_EVENTS)
    return
  }

  send(event)
}

function send(event: TrackEvent): void {
  getGaId() // resolves the id and triggers the once-only prod warning if unset
  try {
    gtagEvent(event.name, event.props)
  } catch (error) {
    console.error(`[analytics] failed to send "${event.name}":`, error)
  }
}
