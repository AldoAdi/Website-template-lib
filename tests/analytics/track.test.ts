import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// The queue and the "warned once" flag are module-level singletons (see
// SPEC.md's analytics code sample), so each test needs a *fresh* module
// instance to stay isolated -- otherwise events queued in one test would
// leak into the next. `vi.resetModules()` + a dynamic re-import gives every
// test its own copy of the whole analytics graph (index.ts, gtag.ts,
// consent.ts together), which matters because consent's `listeners` array
// is also a singleton: importing consent functions from anywhere other than
// this same fresh `analytics` object would bind to a *different* instance
// and the auto-flush-on-grant wiring would silently never fire.
type AnalyticsModule = typeof import('../../src/analytics')

let analytics: AnalyticsModule

const REAL_LOCAL_STORAGE = window.localStorage

function stubGtag(): ReturnType<typeof vi.fn> {
  const mock = vi.fn()
  window.gtag = mock
  return mock
}

beforeEach(async () => {
  vi.resetModules()
  vi.unstubAllEnvs()
  window.localStorage.clear()
  delete (window as { gtag?: unknown }).gtag
  analytics = await import('../../src/analytics')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  delete (window as { gtag?: unknown }).gtag
  Object.defineProperty(window, 'localStorage', {
    value: REAL_LOCAL_STORAGE,
    writable: true,
    configurable: true,
  })
})

describe('track', () => {
  test('sends nothing while consent is unknown', () => {
    const gtag = stubGtag()

    analytics.track('cta_click')

    expect(gtag).not.toHaveBeenCalled()
  })

  test('sends nothing while consent is denied', () => {
    const gtag = stubGtag()

    analytics.denyConsent()
    analytics.track('cta_click')

    expect(gtag).not.toHaveBeenCalled()
  })

  test('queue caps at MAX_QUEUED_EVENTS and drops the oldest entries', () => {
    const gtag = stubGtag()
    const eventCount = 60

    for (let index = 0; index < eventCount; index += 1) {
      analytics.track('bulk_event', { index })
    }
    analytics.grantConsent()

    expect(gtag).toHaveBeenCalledTimes(analytics.MAX_QUEUED_EVENTS)

    const firstFlushedCall = gtag.mock.calls[0]
    const lastFlushedCall = gtag.mock.calls[gtag.mock.calls.length - 1]
    expect(firstFlushedCall?.[2]).toEqual({ index: 10 })
    expect(lastFlushedCall?.[2]).toEqual({ index: 59 })
  })

  test('flushes queued events in enqueue order', () => {
    const gtag = stubGtag()

    analytics.track('first')
    analytics.track('second')
    analytics.track('third')
    analytics.grantConsent()

    const names = gtag.mock.calls.map((call) => call[1])
    expect(names).toEqual(['first', 'second', 'third'])
  })

  test('empties the queue after a flush, so a second grant sends nothing further', () => {
    const gtag = stubGtag()

    analytics.track('only_event')
    analytics.grantConsent()
    expect(gtag).toHaveBeenCalledTimes(1)

    analytics.grantConsent()
    expect(gtag).toHaveBeenCalledTimes(1)
  })

  test('a throwing gtag is caught and logged, and does not block later sends', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const throwingGtag = vi.fn(() => {
      throw new Error('gtag exploded')
    })
    window.gtag = throwingGtag

    analytics.grantConsent()

    expect(() => analytics.track('bad_event')).not.toThrow()
    expect(consoleError).toHaveBeenCalled()

    const workingGtag = vi.fn()
    window.gtag = workingGtag

    expect(() => analytics.track('good_event')).not.toThrow()
    expect(workingGtag).toHaveBeenCalledWith('event', 'good_event', {})
  })

  test('a missing NEXT_PUBLIC_GA_ID warns exactly once across several calls in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubGtag()

    analytics.grantConsent()
    analytics.track('one')
    analytics.track('two')
    analytics.track('three')

    expect(consoleWarn).toHaveBeenCalledTimes(1)
  })

  test('a missing NEXT_PUBLIC_GA_ID stays silent outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubGtag()

    analytics.grantConsent()
    analytics.track('one')
    analytics.track('two')

    expect(consoleWarn).not.toHaveBeenCalled()
  })
})
