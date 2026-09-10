'use client'

import { useEffect, useState, useSyncExternalStore, type ReactElement } from 'react'
import {
  getConsentState,
  onAnalyticsEvent,
  onConsentChange,
  resolveTransport,
} from '../../analytics'
import type { AnalyticsRecord, AnalyticsTransport, ConsentState } from '../../analytics'

/** Query parameter that switches the panel on, on any deploy including production. */
export const DEBUG_PARAM = 'debug'
export const DEBUG_VALUE = 'tracking'

/** Enough history to see a whole funnel without the panel growing without bound. */
export const MAX_INSPECTED_EVENTS = 30

export interface TrackingInspectorProps {
  /**
   * Forces the panel on or off. When omitted it shows only if the URL
   * carries `?debug=tracking`, so it can be opened on a live site without a
   * deploy and stays invisible to real visitors.
   */
  readonly enabled?: boolean
}

const PANEL_CLASSES =
  'bg-background text-foreground border-border fixed right-4 bottom-4 z-[100] flex max-h-[70vh] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border shadow-lg'

const ROW_CLASSES = 'border-border border-t px-3 py-2 font-mono text-xs'

// The query string never changes without a navigation, so there is nothing
// to subscribe to -- but reading it through useSyncExternalStore is what
// keeps the server render ('off') from disagreeing with the client's first
// paint, instead of settling it with a setState inside an effect.
function subscribeToNothing(): () => void {
  return () => undefined
}

function readDebugParam(): boolean {
  return new URLSearchParams(window.location.search).get(DEBUG_PARAM) === DEBUG_VALUE
}

// The server cannot know the query string: under `output: 'export'` every
// page is prerendered once, with no request to read.
function debugParamServerSnapshot(): boolean {
  return false
}

function useIsEnabled(enabled: boolean | undefined): boolean {
  const fromUrl = useSyncExternalStore(subscribeToNothing, readDebugParam, debugParamServerSnapshot)

  return enabled ?? fromUrl
}

function subscribeToConsent(onStoreChange: () => void): () => void {
  return onConsentChange(() => onStoreChange())
}

function consentServerSnapshot(): ConsentState {
  return 'unknown'
}

/**
 * A live view of what the analytics module is actually sending.
 *
 * "Is tracking working?" is normally answered by opening DevTools,
 * filtering the network tab and decoding a `collect` payload -- fine for an
 * engineer, useless for showing a client, and impossible on someone else's
 * machine. This renders the same truth on the page: every event, its full
 * property bag, which tag stack carried it, and whether consent held it
 * back.
 *
 * It reports what the library sent, which is the half that is ours. Whether
 * a GTM container then forwarded it to GA4 is the container's business --
 * confirm that in GTM Preview and GA4 DebugView, which is exactly what the
 * `transport` column tells you to go and check.
 */
export function TrackingInspector({ enabled }: TrackingInspectorProps = {}): ReactElement | null {
  const isEnabled = useIsEnabled(enabled)
  const consent = useSyncExternalStore(subscribeToConsent, getConsentState, consentServerSnapshot)
  const [records, setRecords] = useState<readonly AnalyticsRecord[]>([])
  const [dataLayerSize, setDataLayerSize] = useState(0)

  // Pure read of inlined env vars, so it is stable across server and client
  // and needs no state of its own.
  const transport: AnalyticsTransport = resolveTransport()

  useEffect(() => {
    if (!isEnabled) return

    return onAnalyticsEvent((record) => {
      setRecords((previous) => [record, ...previous].slice(0, MAX_INSPECTED_EVENTS))
      setDataLayerSize(window.dataLayer?.length ?? 0)
    })
  }, [isEnabled])

  if (!isEnabled) return null

  return (
    <aside className={PANEL_CLASSES} aria-label="Tracking inspector">
      <header className="bg-muted flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold">
        <span>Tracking inspector</span>
        <span className="font-mono font-normal">
          {transport} · consent:{consent} · dataLayer:{dataLayerSize}
        </span>
      </header>

      <div className="overflow-y-auto">
        {records.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-xs">
            No events yet. Click a tracked CTA.
          </p>
        ) : (
          records.map((record) => (
            <div key={`${record.at}-${record.name}`} className={ROW_CLASSES}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{record.name}</span>
                <span className="text-muted-foreground">
                  {record.queued ? 'queued (no consent)' : `sent via ${record.transport}`}
                </span>
              </div>
              <pre className="text-muted-foreground mt-1 whitespace-pre-wrap">
                {JSON.stringify(record.props, null, 1)}
              </pre>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
