import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BookingLink } from '../../src/booking/BookingLink'
import { createMemorySink } from '../../src/booking/sink'
import { findAxeViolations } from '../axeHelpers'

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

describe('BookingLink', () => {
  test('renders a link to the first-party booking route', () => {
    render(
      <BookingLink href="/book" location="hero" sinks={[]}>
        Book an appointment
      </BookingLink>,
    )

    expect(screen.getByRole('link').getAttribute('href')).toBe('/book')
  })

  test('records a cta_click carrying the placement', () => {
    const sink = createMemorySink()
    render(
      <BookingLink href="/book" location="hero" sinks={[sink]}>
        Book
      </BookingLink>,
    )

    screen.getByRole('link').click()

    expect(sink.events).toHaveLength(1)
    expect(sink.events[0]?.step).toBe('cta_click')
    expect(sink.events[0]?.location).toBe('hero')
  })

  test('does not record a modified click, which opens a new tab and starts no funnel here', () => {
    const sink = createMemorySink()
    render(
      <BookingLink href="/book" location="nav" sinks={[sink]}>
        Book
      </BookingLink>,
    )

    screen
      .getByRole('link')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))

    expect(sink.events).toHaveLength(0)
  })

  test('applies a caller-supplied class so the CTA keeps the site styling', () => {
    render(
      <BookingLink href="/book" location="hero" sinks={[]} className="bg-primary">
        Book
      </BookingLink>,
    )

    expect(screen.getByRole('link').className).toBe('bg-primary')
  })

  test('a throwing sink never reaches the visitor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const broken = {
      name: 'broken',
      emit(): void {
        throw new Error('sink exploded')
      },
    }
    render(
      <BookingLink href="/book" location="hero" sinks={[broken]}>
        Book
      </BookingLink>,
    )

    expect(() => screen.getByRole('link').click()).not.toThrow()
  })

  test('has no axe violations', async () => {
    const { container } = render(
      <BookingLink href="/book" location="hero" sinks={[]}>
        Book an appointment
      </BookingLink>,
    )

    expect(await findAxeViolations(container)).toEqual([])
  })
})
