import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  CONSENT_CATEGORIES,
  denyConsent,
  getConsentCategories,
  getConsentState,
  grantConsent,
  hasConsentFor,
  resetConsent,
  setConsentCategories,
} from '../../src/analytics/consent'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  resetConsent()
  window.localStorage.clear()
})

describe('consent categories', () => {
  test('reports only functional storage before any decision is made', () => {
    const categories = getConsentCategories()

    expect(categories).toEqual({
      functional: true,
      preferences: false,
      statistics: false,
      marketing: false,
    })
  })

  test('accepting everything grants every category', () => {
    grantConsent()

    for (const category of CONSENT_CATEGORIES) {
      expect(hasConsentFor(category)).toBe(true)
    }
  })

  test('rejecting leaves only functional storage granted', () => {
    denyConsent()

    expect(hasConsentFor('functional')).toBe(true)
    expect(hasConsentFor('statistics')).toBe(false)
    expect(hasConsentFor('marketing')).toBe(false)
  })

  test('a statistics-only decision opens the analytics gate but nothing else', () => {
    setConsentCategories({ statistics: true })

    expect(getConsentState()).toBe('granted')
    expect(hasConsentFor('statistics')).toBe(true)
    expect(hasConsentFor('marketing')).toBe(false)
  })

  test('a marketing-only decision leaves the analytics gate shut', () => {
    setConsentCategories({ marketing: true })

    expect(getConsentState()).toBe('denied')
    expect(hasConsentFor('marketing')).toBe(true)
  })

  test('functional storage cannot be switched off, even when explicitly denied', () => {
    setConsentCategories({ functional: false, statistics: true })

    expect(hasConsentFor('functional')).toBe(true)
  })

  test('a saved decision replaces the previous one rather than merging into it', () => {
    setConsentCategories({ statistics: true, marketing: true })
    setConsentCategories({ statistics: true })

    expect(hasConsentFor('marketing')).toBe(false)
  })

  test('survives a reload', () => {
    setConsentCategories({ preferences: true, statistics: true })

    expect(getConsentCategories()).toEqual({
      functional: true,
      preferences: true,
      statistics: true,
      marketing: false,
    })
  })

  test('a visitor who accepted under the old single-button banner reads as all-granted', () => {
    // No category blob: exactly what a site upgraded from an earlier
    // version of the library finds in a returning visitor's storage.
    window.localStorage.setItem('consent-decision', 'granted')

    expect(getConsentCategories()).toEqual({
      functional: true,
      preferences: true,
      statistics: true,
      marketing: true,
    })
  })

  test('falls back to the stored decision when the category blob is corrupt', () => {
    window.localStorage.setItem('consent-decision', 'denied')
    window.localStorage.setItem('consent-categories', '{not json')

    expect(getConsentCategories().statistics).toBe(false)
  })

  test('ignores non-object category blobs rather than throwing', () => {
    window.localStorage.setItem('consent-decision', 'granted')
    window.localStorage.setItem('consent-categories', '"granted"')

    expect(getConsentCategories().statistics).toBe(true)
  })

  test('resetting clears the category record along with the decision', () => {
    grantConsent()
    resetConsent()

    expect(getConsentState()).toBe('unknown')
    expect(getConsentCategories().statistics).toBe(false)
  })
})
