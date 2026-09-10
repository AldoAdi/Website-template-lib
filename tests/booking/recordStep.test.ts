import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { recordAttribution } from '../../src/booking/attribution'
import { recordBookingStep } from '../../src/booking/recordStep'
import { createMemorySink } from '../../src/booking/sink'

function clearCookies(): void {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  window.localStorage.clear()
  clearCookies()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('recordBookingStep', () => {
  test('builds a complete event and hands it to the sinks', () => {
    const sink = createMemorySink()

    const event = recordBookingStep('booking_view', [sink])

    expect(event.step).toBe('booking_view')
    expect(event.visitorId).not.toBe('')
    expect(event.sessionId).not.toBe('')
    expect(event.at).toBeGreaterThan(0)
    expect(sink.events).toEqual([event])
  })

  test('reuses the same visitor and session ids across steps, so the funnel stitches', () => {
    const sink = createMemorySink()

    const view = recordBookingStep('booking_view', [sink])
    const handoff = recordBookingStep('booking_handoff', [sink])

    expect(handoff.visitorId).toBe(view.visitorId)
    expect(handoff.sessionId).toBe(view.sessionId)
  })

  test('records the cta location when given one', () => {
    const sink = createMemorySink()

    expect(recordBookingStep('cta_click', [sink], { location: 'hero' }).location).toBe('hero')
  })

  test('omits the location key entirely when none is given', () => {
    const sink = createMemorySink()

    expect('location' in recordBookingStep('booking_view', [sink])).toBe(false)
  })

  test('reads stored attribution without capturing from the url by default', () => {
    recordAttribution({ utmSource: 'google', capturedAt: 1 })
    const sink = createMemorySink()

    const event = recordBookingStep('cta_click', [sink])

    expect(event.firstTouch.utmSource).toBe('google')
    expect(event.lastTouch.utmSource).toBe('google')
  })

  test('captures fresh attribution from the url when asked', () => {
    window.history.replaceState({}, '', '/book?utm_source=google&gclid=XYZ')
    const sink = createMemorySink()

    const event = recordBookingStep('booking_view', [sink], { captureFromUrl: true })

    expect(event.lastTouch.utmSource).toBe('google')
    expect(event.lastTouch.gclid).toBe('XYZ')

    window.history.replaceState({}, '', '/')
  })

  test('carries empty touches when nothing has ever been captured', () => {
    const sink = createMemorySink()

    const event = recordBookingStep('cta_click', [sink])

    expect(event.firstTouch).toEqual({})
    expect(event.lastTouch).toEqual({})
  })
})
