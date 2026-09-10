import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BookingConfirmed } from '../../src/booking/BookingConfirmed'
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
  cleanup()
  vi.restoreAllMocks()
})

describe('BookingConfirmed', () => {
  test('records the confirmation on mount', () => {
    const sink = createMemorySink()
    render(
      <BookingConfirmed sinks={[sink]}>
        <p>You are booked.</p>
      </BookingConfirmed>,
    )

    expect(sink.events.map((event) => event.step)).toEqual(['booking_confirmed'])
  })

  test('renders its children', () => {
    render(
      <BookingConfirmed sinks={[]}>
        <p>You are booked.</p>
      </BookingConfirmed>,
    )

    expect(screen.getByText('You are booked.')).toBeDefined()
  })

  test('records exactly once even when the effect runs twice', () => {
    const sink = createMemorySink()
    const { rerender } = render(
      <BookingConfirmed sinks={[sink]}>
        <p>Done</p>
      </BookingConfirmed>,
    )
    rerender(
      <BookingConfirmed sinks={[sink]}>
        <p>Done</p>
      </BookingConfirmed>,
    )

    expect(sink.events).toHaveLength(1)
  })

  test('stitches to the same visitor the handoff used', () => {
    const sink = createMemorySink()
    render(
      <BookingConfirmed sinks={[sink]}>
        <p>Done</p>
      </BookingConfirmed>,
    )

    expect(sink.events[0]?.visitorId).toBe(document.cookie.match(/bk_vid=([^;]+)/)?.[1])
  })
})
