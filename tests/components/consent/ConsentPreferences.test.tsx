import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ConsentPreferences } from '../../../src/components/consent/ConsentPreferences'
import { getConsentCategories, getConsentState, resetConsent } from '../../../src/analytics/consent'
import { findAxeViolations } from '../../axeHelpers'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  resetConsent()
  window.localStorage.clear()
})

describe('ConsentPreferences', () => {
  test('offers every category as a labelled checkbox', () => {
    render(<ConsentPreferences />)

    for (const label of ['Functional', 'Preferences', 'Statistics', 'Marketing']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(label, 'i') })).toBeDefined()
    }
  })

  test('shows strictly necessary storage as checked and not switchable', () => {
    render(<ConsentPreferences />)

    const functional = screen.getByRole('checkbox', { name: /functional/i }) as HTMLInputElement

    expect(functional.checked).toBe(true)
    expect(functional.disabled).toBe(true)
    expect(screen.getByText(/always active/i)).toBeDefined()
  })

  test('persists nothing until save is activated', () => {
    render(<ConsentPreferences />)

    fireEvent.click(screen.getByRole('checkbox', { name: /statistics/i }))

    expect(getConsentState()).toBe('unknown')
  })

  test('saving persists exactly the ticked categories', () => {
    render(<ConsentPreferences />)

    fireEvent.click(screen.getByRole('checkbox', { name: /statistics/i }))
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }))

    expect(getConsentCategories()).toEqual({
      functional: true,
      preferences: false,
      statistics: true,
      marketing: false,
    })
  })

  test('reports the saved decision to the caller', () => {
    const onSave = vi.fn()
    render(<ConsentPreferences onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ functional: true, statistics: false }),
    )
  })

  test('seeds its boxes from a decision already stored', () => {
    window.localStorage.setItem('consent-decision', 'granted')
    render(<ConsentPreferences />)

    const marketing = screen.getByRole('checkbox', { name: /marketing/i }) as HTMLInputElement

    expect(marketing.checked).toBe(true)
  })

  test('uses caller-supplied labels and descriptions, never baked-in copy', () => {
    render(
      <ConsentPreferences
        labels={{ statistics: 'Statistik' }}
        descriptions={{ statistics: 'Anonyme Zählungen.' }}
        saveLabel="Speichern"
      />,
    )

    expect(screen.getByRole('checkbox', { name: /statistik/i })).toBeDefined()
    expect(screen.getByText('Anonyme Zählungen.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDefined()
  })

  test('has no axe violations', async () => {
    const { container } = render(<ConsentPreferences />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
