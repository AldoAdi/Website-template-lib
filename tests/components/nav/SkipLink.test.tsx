import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SkipLink } from '../../../src/components/nav/SkipLink'

afterEach(() => {
  cleanup()
})

describe('SkipLink', () => {
  test('targets the main landmark by default', () => {
    render(<SkipLink />)

    expect(screen.getByRole('link', { name: /skip to content/i }).getAttribute('href')).toBe(
      '#main',
    )
  })

  test('accepts a different target and label', () => {
    render(<SkipLink href="#content" label="Zum Inhalt springen" />)

    expect(screen.getByRole('link', { name: 'Zum Inhalt springen' }).getAttribute('href')).toBe(
      '#content',
    )
  })

  test('stays focusable rather than being hidden from assistive technology', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: /skip to content/i })
    link.focus()

    expect(document.activeElement).toBe(link)
    expect(link.getAttribute('aria-hidden')).toBeNull()
  })
})
