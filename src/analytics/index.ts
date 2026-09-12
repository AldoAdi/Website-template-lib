// Reached via the "./analytics" subpath. Consent is the gate everything
// here sits behind -- see SPEC.md Boundaries: "Never fire an analytics
// event before consent is granted."
import type { TrackEvent } from './types'
import { hasConsent, onConsentChange } from './consent'
import { getGaId, gtagEvent } from './gtag'
import { dataLayerPush, getGtmId } from './dataLayer'
import { notifyAnalyticsEvent } from './observer'

export {
  getConsentState,
  hasConsent,
  grantConsent,
  denyConsent,
  resetConsent,
  onConsentChange,
} from './consent'
export type { ConsentState, ConsentListener } from './consent'
export type { TrackEvent } from './types'
export { GoogleAnalytics } from './GoogleAnalytics'
export type { GoogleAnalyticsProps } from './GoogleAnalytics'
export { GoogleTagManager } from './GoogleTagManager'
export type { GoogleTagManagerProps } from './GoogleTagManager'
export { dataLayerPush, getGtmId } from './dataLayer'
export { onAnalyticsEvent } from './observer'
export type { AnalyticsRecord, AnalyticsObserver } from './observer'

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
    notifyAnalyticsEvent({ ...event, transport: resolveTransport(), queued: true })
    return
  }

  send(event)
}

/** Which tag stack an event is sent through. */
export type AnalyticsTransport = 'gtm' | 'ga4' | 'none'

let hasWarnedBothConfigured = false

/**
 * Picks the transport, preferring GTM when a container is configured.
 *
 * Exactly one, never both. A GTM container sends to GA4 through its own
 * GA4 Configuration tag, so loading the direct GA4 script alongside it
 * makes every event arrive twice -- and double-counted conversions are
 * worse than none, because they look plausible. When both ids are set,
 * GTM wins and the ambiguity is warned about once.
 */
export function resolveTransport(): AnalyticsTransport {
  const gtmId = getGtmId()

  if (gtmId) {
    // Read the raw env rather than calling getGaId(), which warns when the
    // measurement id is missing. With a container configured that is not a
    // misconfiguration -- GA4 is set up inside GTM, not here -- and the
    // warning would fire on every correctly-configured GTM site.
    if (process.env.NEXT_PUBLIC_GA_ID && !hasWarnedBothConfigured) {
      hasWarnedBothConfigured = true
      console.warn(
        '[analytics] Both NEXT_PUBLIC_GTM_ID and NEXT_PUBLIC_GA_ID are set. ' +
          'Sending through GTM only -- configure GA4 inside the container, or events double-count. ' +
          'Unset one of them.',
      )
    }

    return 'gtm'
  }

  // Only now is a missing measurement id worth a warning: no container
  // means direct GA4 was the intent. getGaId() emits it, once.
  return getGaId() ? 'ga4' : 'none'
}

function send(event: TrackEvent): void {
  try {
    // `dataLayer.push` when a container is in play, `gtag` otherwise.
    // Everything upstream of this line -- the consent gate, the queue, the
    // booking funnel -- is identical either way.
    const transport = resolveTransport()

    if (transport === 'gtm') dataLayerPush(event.name, event.props)
    else gtagEvent(event.name, event.props)

    notifyAnalyticsEvent({ ...event, transport, queued: false })
  } catch (error) {
    console.error(`[analytics] failed to send "${event.name}":`, error)
  }
}
