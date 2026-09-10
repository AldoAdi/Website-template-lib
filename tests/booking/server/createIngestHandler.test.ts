import { describe, expect, test, vi } from 'vitest'
import {
  containsForbiddenKey,
  createIngestHandler,
  MAX_BODY_BYTES,
} from '../../../src/booking/server/createIngestHandler'
import { createMemoryBookingStore } from '../../../src/booking/server/store'
import type { BookingEvent } from '../../../src/booking/types'

const VALID: BookingEvent = {
  step: 'booking_handoff',
  visitorId: 'vid-1',
  sessionId: 'sid-1',
  at: 1_700_000_000_000,
  firstTouch: { utmSource: 'google', capturedAt: 1 },
  lastTouch: { gclid: 'ABC', capturedAt: 2 },
}

function post(body: string): Request {
  return new Request('https://clinic.example/api/booking-event', { method: 'POST', body })
}

describe('containsForbiddenKey', () => {
  test('finds a pii-shaped key at the top level', () => {
    expect(containsForbiddenKey({ email: 'a@b.c' })).toBe(true)
  })

  test('finds one nested inside an object', () => {
    expect(containsForbiddenKey({ lastTouch: { phone: '555' } })).toBe(true)
  })

  test('finds one nested inside an array', () => {
    expect(containsForbiddenKey([{ ok: 1 }, { dateOfBirth: '1990' }])).toBe(true)
  })

  test('passes a clean funnel event', () => {
    expect(containsForbiddenKey(VALID)).toBe(false)
  })

  test('handles primitives and null without throwing', () => {
    expect(containsForbiddenKey(null)).toBe(false)
    expect(containsForbiddenKey('a string')).toBe(false)
  })
})

describe('createIngestHandler', () => {
  test('stores a valid event', async () => {
    const store = createMemoryBookingStore()

    const response = await createIngestHandler(store)(post(JSON.stringify(VALID)))

    expect(response.status).toBe(204)
    expect(store.events).toHaveLength(1)
    expect(store.events[0]?.step).toBe('booking_handoff')
  })

  test('rejects a payload carrying a pii-shaped key, so the log stays anonymous', async () => {
    const store = createMemoryBookingStore()
    const onError = vi.fn()

    await createIngestHandler(store, { onError })(
      post(JSON.stringify({ ...VALID, email: 'patient@example.com' })),
    )

    expect(store.events).toHaveLength(0)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('forbidden'))
  })

  test('rejects malformed json', async () => {
    const store = createMemoryBookingStore()
    const onError = vi.fn()

    await createIngestHandler(store, { onError })(post('{ not json'))

    expect(store.events).toHaveLength(0)
    expect(onError).toHaveBeenCalledWith('malformed json', expect.anything())
  })

  test('rejects an event failing the schema', async () => {
    const store = createMemoryBookingStore()
    const onError = vi.fn()

    await createIngestHandler(store, { onError })(
      post(JSON.stringify({ ...VALID, step: 'not_a_step' })),
    )

    expect(store.events).toHaveLength(0)
    expect(onError).toHaveBeenCalledWith('schema validation failed', expect.anything())
  })

  test('rejects an event with an empty visitor id', async () => {
    const store = createMemoryBookingStore()

    await createIngestHandler(store)(post(JSON.stringify({ ...VALID, visitorId: '' })))

    expect(store.events).toHaveLength(0)
  })

  test('rejects an oversized body', async () => {
    const store = createMemoryBookingStore()
    const onError = vi.fn()

    await createIngestHandler(store, { onError })(post('x'.repeat(MAX_BODY_BYTES + 1)))

    expect(store.events).toHaveLength(0)
    expect(onError).toHaveBeenCalledWith('body too large')
  })

  test('measures the body in bytes, not characters', async () => {
    const store = createMemoryBookingStore()
    const onError = vi.fn()
    // Comfortably under the limit by character count, over it by bytes.
    await createIngestHandler(store, { onError })(post('é'.repeat(MAX_BODY_BYTES - 100)))

    expect(onError).toHaveBeenCalledWith('body too large')
  })

  test('drops unknown attribution fields rather than rejecting the whole event', async () => {
    const store = createMemoryBookingStore()

    await createIngestHandler(store)(
      post(JSON.stringify({ ...VALID, lastTouch: { ...VALID.lastTouch, ttclid: 'new-network' } })),
    )

    expect(store.events).toHaveLength(1)
    expect(store.events[0]?.lastTouch).not.toHaveProperty('ttclid')
  })

  test('reports a store failure without surfacing it to the caller', async () => {
    const onError = vi.fn()
    const failing = {
      append: (): Promise<void> => Promise.reject(new Error('connection refused')),
    }

    const response = await createIngestHandler(failing, { onError })(post(JSON.stringify(VALID)))

    expect(response.status).toBe(204)
    expect(onError).toHaveBeenCalledWith('store write failed', expect.anything())
  })

  test('answers every rejection with 204, telling a prober nothing', async () => {
    const store = createMemoryBookingStore()
    const handle = createIngestHandler(store, { onError: () => undefined })

    const statuses = await Promise.all(
      ['{ not json', JSON.stringify({ step: 'nope' }), JSON.stringify(VALID)].map(
        async (body) => (await handle(post(body))).status,
      ),
    )

    expect(statuses).toEqual([204, 204, 204])
  })

  test('defaults to logging errors when no handler is supplied', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await createIngestHandler(createMemoryBookingStore())(post('{ not json'))

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('createMemoryBookingStore', () => {
  test('collects appended events and clears on request', async () => {
    const store = createMemoryBookingStore()

    await store.append(VALID)
    expect(store.events).toHaveLength(1)

    store.clear()
    expect(store.events).toHaveLength(0)
  })
})
