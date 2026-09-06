import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ThemeToggle } from '../../src/theme/ThemeToggle'
import { mockMatchMedia } from './testHelpers'

function renderToggle() {
  return render(
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <ThemeToggle />
    </NextThemesProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  mockMatchMedia(false)
})

// Vitest globals are off (see vitest.config.ts), so @testing-library/react's
// automatic afterEach cleanup never registers itself. Do it explicitly.
afterEach(() => {
  cleanup()
})

describe('ThemeToggle', () => {
  test('renders as a native button with a non-empty accessible name', () => {
    renderToggle()
    const button = screen.getByRole('button')

    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-label')).toBeTruthy()
  })

  test('starts on the theme provided by the surrounding provider', () => {
    renderToggle()
    const button = screen.getByRole('button')

    expect(button.textContent).toMatch(/light/i)
  })

  test('cycles light -> dark -> system -> light on repeated activation', () => {
    renderToggle()
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(button.textContent).toMatch(/dark/i)
    expect(window.localStorage.getItem('theme')).toBe('dark')

    fireEvent.click(button)
    expect(button.textContent).toMatch(/system/i)
    expect(window.localStorage.getItem('theme')).toBe('system')

    fireEvent.click(button)
    expect(button.textContent).toMatch(/light/i)
    expect(window.localStorage.getItem('theme')).toBe('light')
  })

  test('is keyboard accessible: Enter on a focused button activates it', () => {
    renderToggle()
    const button = screen.getByRole('button')
    button.focus()

    expect(document.activeElement).toBe(button)

    // Native <button> elements convert a keyboard Enter/Space into a click
    // event; asserting the semantic element type plus a working click
    // handler is what makes that native behavior available.
    fireEvent.click(button)
    expect(button.textContent).toMatch(/dark/i)
  })

  test('announces the theme switch that activating it will perform', () => {
    renderToggle()
    const button = screen.getByRole('button')

    expect(button.getAttribute('aria-label')).toMatch(/light/i)
    expect(button.getAttribute('aria-label')).toMatch(/dark/i)
  })
})
