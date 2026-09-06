import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import { mockMatchMedia } from './testHelpers'

beforeEach(() => {
  window.localStorage.clear()
  mockMatchMedia(false)
  document.documentElement.className = ''
})

afterEach(() => {
  cleanup()
})

describe('ThemeProvider', () => {
  test('renders its children', () => {
    render(
      <ThemeProvider>
        <p>content</p>
      </ThemeProvider>,
    )

    expect(screen.getByText('content')).toBeDefined()
  })

  test('applies the resolved theme as a class on the document element', () => {
    render(
      <ThemeProvider>
        <p>content</p>
      </ThemeProvider>,
    )

    // attribute="class" strategy: next-themes toggles light/dark as a class
    // on <html>, matching theme.css's `.dark { ... }` overrides. The
    // system-preference mock resolves to "light" here.
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
