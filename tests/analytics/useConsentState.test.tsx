import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { useConsentFor, useConsentState } from '../../src/analytics/useConsentState'
import { grantConsent, resetConsent, setConsentCategories } from '../../src/analytics/consent'

function StateProbe(): ReactElement {
  return <p data-testid="state">{useConsentState()}</p>
}

function CategoryProbe(): ReactElement {
  return <p data-testid="marketing">{String(useConsentFor('marketing'))}</p>
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  resetConsent()
  window.localStorage.clear()
})

describe('useConsentState', () => {
  test('starts at unknown and re-renders when a decision is made', () => {
    render(<StateProbe />)
    expect(screen.getByTestId('state').textContent).toBe('unknown')

    act(() => grantConsent())

    expect(screen.getByTestId('state').textContent).toBe('granted')
  })
})

describe('useConsentFor', () => {
  test('follows one category rather than the overall decision', () => {
    render(<CategoryProbe />)
    expect(screen.getByTestId('marketing').textContent).toBe('false')

    act(() => setConsentCategories({ statistics: true }))
    expect(screen.getByTestId('marketing').textContent).toBe('false')

    act(() => setConsentCategories({ statistics: true, marketing: true }))
    expect(screen.getByTestId('marketing').textContent).toBe('true')
  })

  test('does not re-render itself into a loop over a fresh snapshot object', () => {
    // A record-shaped snapshot would be a new object on every check and
    // React would never settle. Rendering at all is the assertion.
    const { container } = render(<CategoryProbe />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})
