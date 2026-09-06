/**
 * A single analytics event. Either sent to gtag immediately (consent
 * already granted) or held in the pre-consent queue in `index.ts` until a
 * grant flushes it.
 */
export interface TrackEvent {
  readonly name: string
  readonly props: Readonly<Record<string, unknown>>
  readonly at: number
}
