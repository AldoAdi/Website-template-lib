import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { configureBookingSinks, getBookingSinks, resetBookingSinks } from '../../src/booking/config'
import { createMemorySink } from '../../src/booking/sink'

const ORIGINAL_INGEST_URL = process.env.NEXT_PUBLIC_BOOKING_INGEST_URL

beforeEach(() => {
  resetBookingSinks()
  delete process.env.NEXT_PUBLIC_BOOKING_INGEST_URL
})

afterEach(() => {
  resetBookingSinks()
  if (ORIGINAL_INGEST_URL === undefined) delete process.env.NEXT_PUBLIC_BOOKING_INGEST_URL
  else process.env.NEXT_PUBLIC_BOOKING_INGEST_URL = ORIGINAL_INGEST_URL
  vi.restoreAllMocks()
})

describe('getBookingSinks', () => {
  test('defaults to GA alone, so a site that wires nothing still measures', () => {
    expect(getBookingSinks().map((sink) => sink.name)).toEqual(['ga'])
  })

  test('adds the first-party sink once an ingest endpoint is declared', () => {
    process.env.NEXT_PUBLIC_BOOKING_INGEST_URL = '/api/booking-event'

    expect(getBookingSinks().map((sink) => sink.name)).toEqual(['ga', 'http'])
  })

  test('treats an empty ingest url as unset', () => {
    process.env.NEXT_PUBLIC_BOOKING_INGEST_URL = ''

    expect(getBookingSinks().map((sink) => sink.name)).toEqual(['ga'])
  })

  test('returns a stable array identity, so an effect dependency does not refire', () => {
    expect(getBookingSinks()).toBe(getBookingSinks())
  })
})

describe('configureBookingSinks', () => {
  test('overrides the defaults', () => {
    const sink = createMemorySink()
    configureBookingSinks([sink])

    expect(getBookingSinks()).toEqual([sink])
  })

  test('the override keeps a stable identity too', () => {
    configureBookingSinks([createMemorySink()])

    expect(getBookingSinks()).toBe(getBookingSinks())
  })

  test('resetting drops the override and returns to the defaults', () => {
    configureBookingSinks([createMemorySink()])
    resetBookingSinks()

    expect(getBookingSinks().map((sink) => sink.name)).toEqual(['ga'])
  })
})

describe('components without an explicit sinks prop', () => {
  test('fall back to the configured sinks', async () => {
    const sink = createMemorySink()
    configureBookingSinks([sink])

    const { BookingConfirmed } = await import('../../src/booking/BookingConfirmed')
    const { render, cleanup } = await import('@testing-library/react')
    const { createElement } = await import('react')

    render(createElement(BookingConfirmed, { children: 'done' }))

    expect(sink.events.map((event) => event.step)).toEqual(['booking_confirmed'])
    cleanup()
  })
})
