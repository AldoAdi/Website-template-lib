import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { grantConsent } from '../../src/analytics/consent'
import { dataLayerPush, getGtmId } from '../../src/analytics/dataLayer'
import { onAnalyticsEvent, resolveTransport, track } from '../../src/analytics'

const ORIGINAL = {
  gtm: process.env.NEXT_PUBLIC_GTM_ID,
  ga: process.env.NEXT_PUBLIC_GA_ID,
}

beforeEach(() => {
  window.localStorage.clear()
  delete process.env.NEXT_PUBLIC_GTM_ID
  delete process.env.NEXT_PUBLIC_GA_ID
  window.dataLayer = []
  window.gtag = vi.fn()
})

afterEach(() => {
  for (const [key, value] of [
    ['NEXT_PUBLIC_GTM_ID', ORIGINAL.gtm],
    ['NEXT_PUBLIC_GA_ID', ORIGINAL.ga],
  ] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  delete window.dataLayer
  delete window.gtag
  vi.restoreAllMocks()
})

describe('resolveTransport', () => {
  test('reports none when neither id is configured', () => {
    expect(resolveTransport()).toBe('none')
  })

  test('uses direct GA4 when only a measurement id is configured', () => {
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST'

    expect(resolveTransport()).toBe('ga4')
  })

  test('uses GTM when a container is configured', () => {
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TEST'

    expect(resolveTransport()).toBe('gtm')
  })

  // One test, not two: the warning fires once per module lifetime, so a
  // second test asserting it would read the already-spent flag and fail.
  test('prefers GTM when both are set, and warns once about the double-count risk', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TEST'
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST'

    expect(resolveTransport()).toBe('gtm')
    expect(warn.mock.calls.flat().join(' ')).toMatch(/double-count/i)

    resolveTransport()
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('track transport selection', () => {
  test('pushes to the dataLayer when GTM is configured, and does not call gtag', () => {
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TEST'
    grantConsent()

    track('booking_handoff', { session_id: 'sid-1' })

    expect(window.dataLayer).toEqual([{ event: 'booking_handoff', session_id: 'sid-1' }])
    expect(window.gtag).not.toHaveBeenCalled()
  })

  test('calls gtag when only GA4 is configured, and does not touch the dataLayer', () => {
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST'
    grantConsent()

    track('booking_handoff', { session_id: 'sid-1' })

    expect(window.gtag).toHaveBeenCalledWith('event', 'booking_handoff', { session_id: 'sid-1' })
    expect(window.dataLayer).toEqual([])
  })
})

describe('dataLayerPush', () => {
  test('creates the dataLayer when GTM has not loaded yet, so nothing is lost', () => {
    delete window.dataLayer

    dataLayerPush('cta_click', { cta_location: 'hero' })

    expect(window.dataLayer).toEqual([{ event: 'cta_click', cta_location: 'hero' }])
  })

  test('puts the event name under the key GTM triggers match on', () => {
    dataLayerPush('booking_view', {})

    expect((window.dataLayer?.[0] as { event: string }).event).toBe('booking_view')
  })
})

describe('getGtmId', () => {
  test('reads the container id from the environment', () => {
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-ABC123'

    expect(getGtmId()).toBe('GTM-ABC123')
  })

  test('is undefined when unset', () => {
    expect(getGtmId()).toBeUndefined()
  })
})

describe('onAnalyticsEvent', () => {
  test('reports a sent event with the transport that carried it', () => {
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TEST'
    grantConsent()
    const seen: unknown[] = []
    const unsubscribe = onAnalyticsEvent((record) => seen.push(record))

    track('cta_click', { cta_location: 'hero' })

    expect(seen).toEqual([
      expect.objectContaining({ name: 'cta_click', transport: 'gtm', queued: false }),
    ])
    unsubscribe()
  })

  test('reports an event held by the consent queue as queued', () => {
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TEST'
    const seen: { queued: boolean }[] = []
    const unsubscribe = onAnalyticsEvent((record) => seen.push(record))

    track('cta_click', {})

    expect(seen[0]?.queued).toBe(true)
    unsubscribe()
  })

  test('unsubscribing stops delivery', () => {
    grantConsent()
    const seen: unknown[] = []
    onAnalyticsEvent((record) => seen.push(record))()

    track('cta_click', {})

    expect(seen).toHaveLength(0)
  })

  test('an observer that throws does not break tracking', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST'
    grantConsent()
    const unsubscribe = onAnalyticsEvent(() => {
      throw new Error('inspector exploded')
    })

    expect(() => track('cta_click', {})).not.toThrow()
    expect(window.gtag).toHaveBeenCalled()
    unsubscribe()
  })
})
