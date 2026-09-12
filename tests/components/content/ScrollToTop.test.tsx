import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { ScrollToTop } from '../../../src/components/content/ScrollToTop'
import { mockMatchMedia } from '../../theme/testHelpers'

function scrollTo(y: number): void {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
  act(() => {
    fireEvent.scroll(window)
  })
}

beforeEach(() => {
  mockMatchMedia(false)
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ScrollToTop', () => {
  test('renders nothing at the top of the page, where there is nowhere to go back to', () => {
    render(<ScrollToTop />)

    expect(screen.queryByRole('button', { name: /scroll to top/i })).toBeNull()
  })

  test('appears once the visitor is a viewport or so down', () => {
    render(<ScrollToTop />)

    scrollTo(900)

    expect(screen.getByRole('button', { name: /scroll to top/i })).toBeDefined()
  })

  test('disappears again on the way back up, so it is never a stray tab stop', () => {
    render(<ScrollToTop />)

    scrollTo(900)
    scrollTo(0)

    expect(screen.queryByRole('button', { name: /scroll to top/i })).toBeNull()
  })

  test('honours a caller-chosen threshold', () => {
    render(<ScrollToTop showAfterPx={100} />)

    scrollTo(200)

    expect(screen.getByRole('button', { name: /scroll to top/i })).toBeDefined()
  })

  test('scrolls smoothly by default', () => {
    render(<ScrollToTop />)
    scrollTo(900)

    fireEvent.click(screen.getByRole('button', { name: /scroll to top/i }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  test('jumps instead of scrolling under prefers-reduced-motion', () => {
    mockMatchMedia(true)
    render(<ScrollToTop />)
    scrollTo(900)

    fireEvent.click(screen.getByRole('button', { name: /scroll to top/i }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  test('accepts a translated accessible name', () => {
    render(<ScrollToTop label="Nach oben" />)
    scrollTo(900)

    expect(screen.getByRole('button', { name: 'Nach oben' })).toBeDefined()
  })
})
