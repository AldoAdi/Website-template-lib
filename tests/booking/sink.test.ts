import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { denyConsent, grantConsent } from '../../src/analytics/consent'
import {
  createGaSink,
  createHttpSink,
  createMemorySink,
  emitBookingEvent,
  toFlatProps,
} from '../../src/booking/sink'
import type { BookingEvent } from '../../src/booking/types'

const EVENT: BookingEvent = {
  step: 'booking_handoff',
  visitorId: 'vid-1',
  sessionId: 'sid-1',
  at: 1_700_000_000_000,
  firstTouch: { utmSource: 'google', utmCampaign: 'implants', capturedAt: 1 },
  lastTouch: { utmSource: 'facebook', capturedAt: 2 },
}

beforeEach(() => {
  window.localStorage.clear()
  window.gtag = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  delete window.gtag
})

describe('toFlatProps', () => {
  test('flattens both touches under distinct prefixes', () => {
    const props = toFlatProps(EVENT)

    expect(props.first_utmSource).toBe('google')
    expect(props.last_utmSource).toBe('facebook')
  })

  test('carries the step and both ids', () => {
    const props = toFlatProps(EVENT)

    expect(props).toMatchObject({
      booking_step: 'booking_handoff',
      visitor_id: 'vid-1',
      session_id: 'sid-1',
    })
  })

  test('includes the cta location only when the event has one', () => {
    expect(toFlatProps(EVENT).cta_location).toBeUndefined()
    expect(toFlatProps({ ...EVENT, location: 'hero' }).cta_location).toBe('hero')
  })
})

describe('createGaSink', () => {
  test('sends nothing before consent is granted', () => {
    createGaSink().emit(EVENT)

    expect(window.gtag).not.toHaveBeenCalled()
  })

  test('flushes the queued event to gtag the moment consent is granted', () => {
    createGaSink().emit(EVENT)
    grantConsent()

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'booking_handoff',
      expect.objectContaining({ session_id: 'sid-1' }),
    )
  })

  test('sends immediately once consent is already granted', () => {
    grantConsent()
    createGaSink().emit(EVENT)

    expect(window.gtag).toHaveBeenCalledTimes(1)
  })
})

describe('createHttpSink', () => {
  test('holds events until consent is granted, matching the library-wide gate', () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true })

    createHttpSink('/api/booking-event').emit(EVENT)
    expect(sendBeacon).not.toHaveBeenCalled()

    grantConsent()
    createHttpSink('/api/booking-event').emit(EVENT)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })

  test('sends without consent only when a caller explicitly opts out of the gate', () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true })
    denyConsent()

    createHttpSink('/api/booking-event', { requiresConsent: false }).emit(EVENT)

    expect(sendBeacon).toHaveBeenCalledTimes(1)
  })

  test('posts the event to the given endpoint as a json blob', () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true })
    grantConsent()

    createHttpSink('https://ingest.example/events').emit(EVENT)

    const [endpoint, body] = sendBeacon.mock.calls[0] as [string, Blob]
    expect(endpoint).toBe('https://ingest.example/events')
    expect(body.type).toBe('application/json')
  })

  test('is a silent no-op where sendBeacon does not exist', () => {
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true })
    grantConsent()

    expect(() => createHttpSink('/api/booking-event').emit(EVENT)).not.toThrow()
  })
})

describe('createMemorySink', () => {
  test('collects events in order', () => {
    const sink = createMemorySink()

    sink.emit(EVENT)
    sink.emit({ ...EVENT, step: 'booking_confirmed' })

    expect(sink.events.map((event) => event.step)).toEqual(['booking_handoff', 'booking_confirmed'])
  })
})

describe('emitBookingEvent', () => {
  test('fans out to every sink', () => {
    const a = createMemorySink()
    const b = createMemorySink()

    emitBookingEvent(EVENT, [a, b])

    expect(a.events).toHaveLength(1)
    expect(b.events).toHaveLength(1)
  })

  test('a throwing sink neither reaches the page nor stops the sinks after it', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const survivor = createMemorySink()
    const broken = {
      name: 'broken',
      emit(): void {
        throw new Error('sink exploded')
      },
    }

    expect(() => emitBookingEvent(EVENT, [broken, survivor])).not.toThrow()
    expect(survivor.events).toHaveLength(1)
    expect(consoleError).toHaveBeenCalled()
  })
})
