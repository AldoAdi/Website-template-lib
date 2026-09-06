import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  denyConsent,
  getConsentState,
  grantConsent,
  hasConsent,
  onConsentChange,
} from '../../src/analytics/consent'

// Preserve the real localStorage across the throwing-storage tests so later
// tests are not left running against a broken stub.
const REAL_LOCAL_STORAGE = window.localStorage

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: REAL_LOCAL_STORAGE,
    writable: true,
    configurable: true,
  })
})

describe('consent module', () => {
  test('default state is unknown when nothing is stored', () => {
    expect(getConsentState()).toBe('unknown')
    expect(hasConsent()).toBe(false)
  })

  test('granting persists and is read back', () => {
    grantConsent()

    expect(getConsentState()).toBe('granted')
    expect(hasConsent()).toBe(true)
  })

  test('denying persists and is read back', () => {
    denyConsent()

    expect(getConsentState()).toBe('denied')
    expect(hasConsent()).toBe(false)
  })

  test('subscribers are notified on change, and unsubscribe stops notifications', () => {
    const listener = vi.fn()
    const unsubscribe = onConsentChange(listener)

    grantConsent()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith('granted')

    unsubscribe()
    denyConsent()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('a localStorage that throws on getItem yields unknown rather than throwing', () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('SecurityError: access denied')
        },
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    })

    expect(() => getConsentState()).not.toThrow()
    expect(getConsentState()).toBe('unknown')
    expect(hasConsent()).toBe(false)
  })

  test('a localStorage that throws on setItem does not propagate', () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    })

    expect(() => grantConsent()).not.toThrow()
    expect(() => denyConsent()).not.toThrow()
  })
})
