import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { denyConsent } from '../../src/analytics/consent'
import { BookingRedirect, DEFAULT_REDIRECT_DELAY_MS } from '../../src/booking/BookingRedirect'
import { createGaSink, createMemorySink } from '../../src/booking/sink'
import { findAxeViolations } from '../axeHelpers'

const PROVIDER = 'https://www.flexbook.me/clinic/googlereserve/1'

let replace: ReturnType<typeof vi.fn>

function clearCookies(): void {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  window.localStorage.clear()
  clearCookies()
  window.gtag = vi.fn()
  replace = vi.fn()
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      replace,
      search: '',
      pathname: '/book',
      origin: 'http://localhost',
      protocol: 'http:',
    },
    writable: true,
    configurable: true,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.restoreAllMocks()
  delete window.gtag
})

describe('BookingRedirect', () => {
  test('records the view and the handoff before navigating', () => {
    const sink = createMemorySink()
    render(<BookingRedirect providerUrl={PROVIDER} sinks={[sink]} />)

    expect(sink.events.map((event) => event.step)).toEqual(['booking_view', 'booking_handoff'])
    expect(replace).not.toHaveBeenCalled()
  })

  test('navigates to the provider with our ids attached once the delay elapses', () => {
    const sink = createMemorySink()
    render(<BookingRedirect providerUrl={PROVIDER} sinks={[sink]} />)

    act(() => {
      vi.advanceTimersByTime(DEFAULT_REDIRECT_DELAY_MS)
    })

    const target = new URL(replace.mock.calls[0]?.[0] as string)
    expect(target.origin).toBe('https://www.flexbook.me')
    expect(target.searchParams.get('bk_sid')).toBe(sink.events[0]?.sessionId)
  })

  test("still redirects when consent was denied -- measurement is our problem, not the visitor's", () => {
    denyConsent()
    const sink = createMemorySink()
    render(<BookingRedirect providerUrl={PROVIDER} sinks={[createGaSink(), sink]} />)

    act(() => {
      vi.advanceTimersByTime(DEFAULT_REDIRECT_DELAY_MS)
    })

    expect(window.gtag).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledTimes(1)
  })

  test('a sink that throws does not prevent the redirect', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const broken = {
      name: 'broken',
      emit(): void {
        throw new Error('sink exploded')
      },
    }

    render(<BookingRedirect providerUrl={PROVIDER} sinks={[broken]} />)

    act(() => {
      vi.advanceTimersByTime(DEFAULT_REDIRECT_DELAY_MS)
    })

    expect(replace).toHaveBeenCalledTimes(1)
  })

  test('honours a custom delay', () => {
    render(<BookingRedirect providerUrl={PROVIDER} sinks={[]} redirectDelayMs={50} />)

    act(() => {
      vi.advanceTimersByTime(49)
    })
    expect(replace).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(replace).toHaveBeenCalledTimes(1)
  })

  test('renders a continue link that works without javascript', () => {
    render(<BookingRedirect providerUrl={PROVIDER} sinks={[]} />)

    const link = screen.getByRole('link', { name: /continue to booking/i })
    expect(link.getAttribute('href')).toContain('flexbook.me')
  })

  test('announces progress to a screen reader', () => {
    render(<BookingRedirect providerUrl={PROVIDER} sinks={[]} />)

    expect(screen.getByRole('status').textContent).toMatch(/taking you to booking/i)
  })

  test('renders the fallback, so a failed redirect can still convert by phone', () => {
    render(
      <BookingRedirect
        providerUrl={PROVIDER}
        sinks={[]}
        fallback={<a href="tel:+15624388802">Or call (562) 438-8802</a>}
      />,
    )

    expect(screen.getByRole('link', { name: /call/i })).toBeDefined()
  })

  test('accepts custom copy', () => {
    render(
      <BookingRedirect
        providerUrl={PROVIDER}
        sinks={[]}
        heading="Hold tight"
        body="Nearly there"
      />,
    )

    expect(screen.getByRole('status').textContent).toBe('Hold tight')
    expect(screen.getByText('Nearly there')).toBeDefined()
  })

  test('records exactly one handoff even when the effect runs twice', () => {
    const sink = createMemorySink()
    const { rerender } = render(<BookingRedirect providerUrl={PROVIDER} sinks={[sink]} />)
    rerender(<BookingRedirect providerUrl={PROVIDER} sinks={[sink]} />)

    expect(sink.events.filter((event) => event.step === 'booking_handoff')).toHaveLength(1)
  })

  test('has no axe violations', async () => {
    const { container } = render(<BookingRedirect providerUrl={PROVIDER} sinks={[]} />)

    vi.useRealTimers()
    expect(await findAxeViolations(container)).toEqual([])
  })
})
