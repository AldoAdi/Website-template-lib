import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { CookieBanner } from '../../../src/components/consent/CookieBanner'
import { findAxeViolations } from '../../axeHelpers'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('CookieBanner', () => {
  test('renders while consent is unknown', () => {
    render(<CookieBanner />)

    expect(screen.getByRole('button', { name: /accept/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /reject/i })).toBeDefined()
  })

  test('hides after accept, and stays hidden across a remount', () => {
    const { unmount } = render(<CookieBanner />)

    fireEvent.click(screen.getByRole('button', { name: /accept/i }))

    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull()

    unmount()
    render(<CookieBanner />)

    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
  })

  test('hides after reject, and stays hidden across a remount', () => {
    const { unmount } = render(<CookieBanner />)

    fireEvent.click(screen.getByRole('button', { name: /reject/i }))

    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull()

    unmount()
    render(<CookieBanner />)

    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull()
  })

  test('both accept and reject are real, keyboard-focusable buttons', () => {
    render(<CookieBanner />)

    const acceptButton = screen.getByRole('button', { name: /accept/i })
    const rejectButton = screen.getByRole('button', { name: /reject/i })

    expect(acceptButton.tagName).toBe('BUTTON')
    expect(rejectButton.tagName).toBe('BUTTON')

    rejectButton.focus()
    expect(document.activeElement).toBe(rejectButton)

    acceptButton.focus()
    expect(document.activeElement).toBe(acceptButton)
  })

  test('accepts custom copy via props instead of baked-in marketing text', () => {
    render(
      <CookieBanner
        message="Custom cookie copy."
        acceptLabel="Yes please"
        rejectLabel="No thanks"
      />,
    )

    expect(screen.getByText('Custom cookie copy.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Yes please' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeDefined()
  })

  test('has no axe violations while visible', async () => {
    render(<CookieBanner />)

    const violations = await findAxeViolations(document.body)

    expect(violations).toEqual([])
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    const { container } = render(<CookieBanner />)

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})

describe('CookieBanner preferences panel', () => {
  test('keeps the panel closed until the visitor asks for it', () => {
    render(<CookieBanner />)

    expect(screen.queryByRole('checkbox', { name: /statistics/i })).toBeNull()
    expect(
      screen.getByRole('button', { name: /manage preferences/i }).getAttribute('aria-expanded'),
    ).toBe('false')
  })

  test('reveals the category panel and reports the disclosure as expanded', () => {
    render(<CookieBanner />)

    const disclosure = screen.getByRole('button', { name: /manage preferences/i })
    fireEvent.click(disclosure)

    expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('checkbox', { name: /statistics/i })).toBeDefined()
  })

  test('the disclosure names the panel it controls', () => {
    render(<CookieBanner />)

    const disclosure = screen.getByRole('button', { name: /manage preferences/i })
    fireEvent.click(disclosure)

    const panelId = disclosure.getAttribute('aria-controls') as string

    expect(document.getElementById(panelId)).not.toBeNull()
  })

  test('saving a granular decision dismisses the banner', () => {
    render(<CookieBanner />)

    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /statistics/i }))
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }))

    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
  })

  test('can be reduced to a two-button banner for a site with nothing to choose between', () => {
    render(<CookieBanner showPreferences={false} />)

    expect(screen.queryByRole('button', { name: /manage preferences/i })).toBeNull()
    expect(screen.getByRole('button', { name: /accept/i })).toBeDefined()
  })

  test('has no axe violations with the panel open', async () => {
    const { container } = render(<CookieBanner />)
    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }))

    expect(await findAxeViolations(container)).toEqual([])
  })
})
