import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CallLink } from '../../src/booking/CallLink'
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

describe('CallLink', () => {
  test('renders a dialable tel: href from a human-formatted number', () => {
    render(<CallLink phone="(562) 438-8802" location="header" sinks={[]} />)

    expect(screen.getByRole('link').getAttribute('href')).toBe('tel:5624388802')
  })

  test('shows the number as written when no children are given', () => {
    render(<CallLink phone="(562) 438-8802" location="header" sinks={[]} />)

    expect(screen.getByRole('link').textContent).toBe('(562) 438-8802')
  })

  test('renders children in place of the number when given', () => {
    render(
      <CallLink phone="(562) 438-8802" location="header" sinks={[]}>
        Call the practice
      </CallLink>,
    )

    expect(screen.getByRole('link').textContent).toBe('Call the practice')
  })

  test('records a call_click carrying the placement', () => {
    const sink = createMemorySink()
    render(<CallLink phone="(562) 438-8802" location="sticky-bar" sinks={[sink]} />)

    screen.getByRole('link').click()

    expect(sink.events).toHaveLength(1)
    expect(sink.events[0]?.step).toBe('call_click')
    expect(sink.events[0]?.location).toBe('sticky-bar')
  })

  test('stamps the same session and visitor ids as the rest of the funnel', () => {
    const sink = createMemorySink()
    render(<CallLink phone="5624388802" location="header" sinks={[sink]} />)

    screen.getByRole('link').click()

    expect(sink.events[0]?.sessionId).toMatch(/\S/)
    expect(sink.events[0]?.visitorId).toMatch(/\S/)
  })

  test('does not record a modified click, which continues in another tab', () => {
    const sink = createMemorySink()
    render(<CallLink phone="5624388802" location="header" sinks={[sink]} />)

    fireEvent.click(screen.getByRole('link'), { metaKey: true })

    expect(sink.events).toHaveLength(0)
  })

  test('still navigates when a sink throws', () => {
    const exploding = {
      name: 'exploding',
      emit: () => {
        throw new Error('sink down')
      },
    }
    render(<CallLink phone="5624388802" location="header" sinks={[exploding]} />)

    expect(() => screen.getByRole('link').click()).not.toThrow()
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <CallLink phone="(562) 438-8802" location="header" sinks={[]} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
