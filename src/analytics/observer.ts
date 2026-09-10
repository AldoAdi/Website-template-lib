import type { AnalyticsTransport } from './index'

/**
 * A tap on everything the analytics module does.
 *
 * Exists because "is tracking working?" is otherwise answered by opening
 * DevTools, filtering the network tab, and decoding a `collect` payload --
 * which is fine for an engineer and useless for showing a client. This
 * lets `TrackingInspector` render the same truth on the page.
 *
 * Purely observational. Nothing here affects what is sent.
 */
export interface AnalyticsRecord {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  /** Which tag stack carried it, or `'none'` when nothing is configured. */
  readonly transport: AnalyticsTransport
  /** True when the event was held by the pre-consent queue rather than sent. */
  readonly queued: boolean
  readonly at: number
}

export type AnalyticsObserver = (record: AnalyticsRecord) => void

let observers: readonly AnalyticsObserver[] = []

/** Subscribes to analytics activity. Returns an unsubscribe function. */
export function onAnalyticsEvent(observer: AnalyticsObserver): () => void {
  observers = [...observers, observer]

  return () => {
    observers = observers.filter((registered) => registered !== observer)
  }
}

/**
 * Notifies observers. Never throws into the caller -- a broken inspector
 * must not take analytics down with it, let alone the page.
 */
export function notifyAnalyticsEvent(record: AnalyticsRecord): void {
  for (const observer of observers) {
    try {
      observer(record)
    } catch (error) {
      console.error('[analytics] observer failed:', error)
    }
  }
}
