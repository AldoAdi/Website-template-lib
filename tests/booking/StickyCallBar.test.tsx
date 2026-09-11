import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StickyCallBar } from '../../src/booking/StickyCallBar'
import { configureBookingSinks, resetBookingSinks } from '../../src/booking/config'
import { createMemorySink } from '../../src/booking/sink'
import { denyConsent, grantConsent } from '../../src/analytics/consent'
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
  resetBookingSinks()
})

afterEach(() => {
  cleanup()
  resetBookingSinks()
  vi.restoreAllMocks()
})

describe('StickyCallBar', () => {
  test('renders nothing while the consent decision is outstanding', () => {
    const { container } = render(<StickyCallBar phone="5624388802" bookHref="/book" />)

    expect(container.innerHTML).toBe('')
  })

  test('appears once consent is granted', () => {
    grantConsent()
    render(<StickyCallBar phone="5624388802" bookHref="/book" />)

    expect(screen.getByRole('region', { name: 'Contact actions' })).toBeDefined()
  })

  test('appears once consent is denied -- a refusal hides the tracking, not the phone number', () => {
    denyConsent()
    render(<StickyCallBar phone="5624388802" bookHref="/book" />)

    expect(screen.getByRole('region', { name: 'Contact actions' })).toBeDefined()
  })

  test('offers both a call and a booking route', () => {
    grantConsent()
    render(<StickyCallBar phone="(562) 438-8802" bookHref="/book" />)

    const links = screen.getAllByRole('link')

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['tel:5624388802', '/book'])
  })

  test('uses short default labels and accepts overrides', () => {
    grantConsent()
    render(<StickyCallBar phone="5624388802" bookHref="/book" />)
    expect(screen.getByRole('link', { name: 'Call' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Book' })).toBeDefined()

    cleanup()

    render(
      <StickyCallBar
        phone="5624388802"
        bookHref="/book"
        callLabel="Call us"
        bookLabel="Book online"
      />,
    )
    expect(screen.getByRole('link', { name: 'Call us' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Book online' })).toBeDefined()
  })

  test('records the call through the app-wide sinks under its own placement', () => {
    grantConsent()
    const sink = createMemorySink()
    configureBookingSinks([sink])

    render(<StickyCallBar phone="5624388802" bookHref="/book" />)
    screen.getByRole('link', { name: 'Call' }).click()

    expect(sink.events).toHaveLength(1)
    expect(sink.events[0]?.step).toBe('call_click')
    expect(sink.events[0]?.location).toBe('sticky-bar')
  })

  test('accepts a custom placement', () => {
    grantConsent()
    const sink = createMemorySink()
    configureBookingSinks([sink])

    render(<StickyCallBar phone="5624388802" bookHref="/book" location="footer-bar" />)
    screen.getByRole('link', { name: 'Call' }).click()

    expect(sink.events[0]?.location).toBe('footer-bar')
  })

  test('reserves the height it covers so the end of the page stays reachable', () => {
    grantConsent()
    const { container } = render(<StickyCallBar phone="5624388802" bookHref="/book" />)
    const spacer = container.firstElementChild

    expect(spacer?.getAttribute('aria-hidden')).toBe('true')
    expect(spacer?.className).toContain('md:hidden')
  })

  test('has no axe violations', async () => {
    grantConsent()
    render(
      <main>
        <StickyCallBar phone="(562) 438-8802" bookHref="/book" />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
