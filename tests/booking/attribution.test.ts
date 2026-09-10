import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getAttribution,
  isEmptyAttribution,
  MAX_ATTRIBUTION_VALUE_LENGTH,
  parseAttribution,
  recordAttribution,
} from '../../src/booking/attribution'

const ORIGIN = 'https://clinic.example'
const NOW = 1_700_000_000_000

beforeEach(() => {
  window.localStorage.clear()
})

describe('parseAttribution', () => {
  test('extracts the utm set and the click ids', () => {
    const attribution = parseAttribution({
      search: '?utm_source=google&utm_medium=cpc&utm_campaign=implants&gclid=ABC123',
      now: NOW,
    })

    expect(attribution).toMatchObject({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'implants',
      gclid: 'ABC123',
      capturedAt: NOW,
    })
  })

  test('accepts a search string with or without the leading question mark', () => {
    const withMark = parseAttribution({ search: '?utm_source=bing', now: NOW })
    const without = parseAttribution({ search: 'utm_source=bing', now: NOW })

    expect(withMark.utmSource).toBe('bing')
    expect(without.utmSource).toBe('bing')
  })

  test('drops blank and whitespace-only values rather than storing empty strings', () => {
    const attribution = parseAttribution({ search: '?utm_source=&utm_medium=%20', now: NOW })

    expect(attribution.utmSource).toBeUndefined()
    expect(attribution.utmMedium).toBeUndefined()
  })

  test('caps an over-long value so a crafted url cannot bloat storage', () => {
    const attribution = parseAttribution({
      search: `?utm_campaign=${'x'.repeat(MAX_ATTRIBUTION_VALUE_LENGTH + 50)}`,
      now: NOW,
    })

    expect(attribution.utmCampaign).toHaveLength(MAX_ATTRIBUTION_VALUE_LENGTH)
  })

  test('keeps a cross-origin referrer', () => {
    const attribution = parseAttribution({
      search: '',
      referrer: 'https://www.google.com/search',
      origin: ORIGIN,
      now: NOW,
    })

    expect(attribution.referrer).toBe('https://www.google.com/search')
  })

  test('discards a same-origin referrer, which is only internal navigation', () => {
    const attribution = parseAttribution({
      search: '',
      referrer: `${ORIGIN}/services/implants`,
      origin: ORIGIN,
      now: NOW,
    })

    expect(attribution.referrer).toBeUndefined()
  })

  test('discards an unparsable referrer', () => {
    const attribution = parseAttribution({
      search: '',
      referrer: 'not a url',
      origin: ORIGIN,
      now: NOW,
    })

    expect(attribution.referrer).toBeUndefined()
  })

  test('records the landing path when given one', () => {
    const attribution = parseAttribution({ search: '', landingPath: '/book', now: NOW })

    expect(attribution.landingPath).toBe('/book')
  })

  test('stamps the current clock when no now is injected', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW)

    expect(parseAttribution({ search: '' }).capturedAt).toBe(NOW)

    vi.restoreAllMocks()
  })
})

describe('isEmptyAttribution', () => {
  test('a timestamp-only attribution counts as empty', () => {
    expect(isEmptyAttribution({ capturedAt: NOW })).toBe(true)
  })

  test('a landing path alone counts as empty -- it is not attribution', () => {
    expect(isEmptyAttribution({ capturedAt: NOW, landingPath: '/book' })).toBe(true)
  })

  test('any campaign field makes it non-empty', () => {
    expect(isEmptyAttribution({ capturedAt: NOW, utmSource: 'google' })).toBe(false)
  })

  test('a click id alone makes it non-empty', () => {
    expect(isEmptyAttribution({ capturedAt: NOW, gclid: 'ABC' })).toBe(false)
  })

  test('a cross-origin referrer alone makes it non-empty', () => {
    expect(isEmptyAttribution({ capturedAt: NOW, referrer: 'https://www.google.com/' })).toBe(false)
  })
})

describe('recordAttribution', () => {
  test('seeds both touches on the first visit', () => {
    const stored = recordAttribution({ utmSource: 'google', capturedAt: NOW })

    expect(stored.firstTouch.utmSource).toBe('google')
    expect(stored.lastTouch.utmSource).toBe('google')
  })

  test('a later campaign overwrites last touch but never first touch', () => {
    recordAttribution({ utmSource: 'google', utmCampaign: 'implants', capturedAt: NOW })
    const stored = recordAttribution({ utmSource: 'facebook', capturedAt: NOW + 1000 })

    expect(stored.firstTouch.utmSource).toBe('google')
    expect(stored.firstTouch.utmCampaign).toBe('implants')
    expect(stored.lastTouch.utmSource).toBe('facebook')
  })

  // The regression this exists for: an ad lands on the homepage, the
  // visitor clicks through to /book, and /book -- which carries no query
  // string -- overwrites last touch with a landingPath-only record, erasing
  // the gclid that paid for the visit.
  test('navigating to another page does not erase the campaign that brought them in', () => {
    recordAttribution({
      utmSource: 'google',
      utmCampaign: 'implants',
      gclid: 'ABC',
      capturedAt: NOW,
    })

    const stored = recordAttribution({ landingPath: '/book', capturedAt: NOW + 1000 })

    expect(stored.lastTouch.gclid).toBe('ABC')
    expect(stored.lastTouch.utmCampaign).toBe('implants')
    expect(stored.firstTouch.gclid).toBe('ABC')
  })

  test('an empty attribution leaves both touches intact', () => {
    recordAttribution({ utmSource: 'google', capturedAt: NOW })
    const stored = recordAttribution({ capturedAt: NOW + 1000 })

    expect(stored.firstTouch.utmSource).toBe('google')
    expect(stored.lastTouch.utmSource).toBe('google')
  })

  test('a hand-edited storage value is treated as nothing stored', () => {
    window.localStorage.setItem('booking-attribution', '{ not json')

    const stored = recordAttribution({ utmSource: 'google', capturedAt: NOW })

    expect(stored.firstTouch.utmSource).toBe('google')
  })

  test('a stored value missing a touch is treated as nothing stored', () => {
    window.localStorage.setItem('booking-attribution', JSON.stringify({ firstTouch: {} }))

    const stored = recordAttribution({ utmSource: 'google', capturedAt: NOW })

    expect(stored.lastTouch.utmSource).toBe('google')
  })

  test('a storage that throws on write still returns the touches without throwing', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => recordAttribution({ utmSource: 'google', capturedAt: NOW })).not.toThrow()

    setItem.mockRestore()
  })
})

describe('getAttribution', () => {
  test('returns empty touches when nothing has been recorded', () => {
    expect(getAttribution()).toEqual({ firstTouch: {}, lastTouch: {} })
  })

  test('reads back what was recorded without recording anything new', () => {
    recordAttribution({ utmSource: 'google', capturedAt: NOW })

    expect(getAttribution().firstTouch.utmSource).toBe('google')
  })
})
