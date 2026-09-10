import { describe, expect, test } from 'vitest'
import { buildBookingUrl, SESSION_PARAM, VISITOR_PARAM } from '../../src/booking/buildBookingUrl'

const PROVIDER = 'https://www.flexbook.me/clinic/googlereserve/1'
const IDS = { visitorId: 'vid-1', sessionId: 'sid-1' } as const

describe('buildBookingUrl', () => {
  test('appends the visitor and session ids', () => {
    const url = new URL(buildBookingUrl({ providerUrl: PROVIDER, ...IDS }))

    expect(url.searchParams.get(SESSION_PARAM)).toBe('sid-1')
    expect(url.searchParams.get(VISITOR_PARAM)).toBe('vid-1')
  })

  test("preserves the provider's own query string", () => {
    const url = new URL(buildBookingUrl({ providerUrl: `${PROVIDER}?location=main&new=1`, ...IDS }))

    expect(url.searchParams.get('location')).toBe('main')
    expect(url.searchParams.get('new')).toBe('1')
    expect(url.searchParams.get(SESSION_PARAM)).toBe('sid-1')
  })

  test('produces exactly one question mark when the provider url had none', () => {
    const url = buildBookingUrl({ providerUrl: PROVIDER, ...IDS })

    expect(url.split('?')).toHaveLength(2)
  })

  test('leaves the path and origin untouched', () => {
    const url = new URL(buildBookingUrl({ providerUrl: PROVIDER, ...IDS }))

    expect(url.origin).toBe('https://www.flexbook.me')
    expect(url.pathname).toBe('/clinic/googlereserve/1')
  })

  test('omits utm parameters unless forwarding is switched on', () => {
    const url = new URL(
      buildBookingUrl({ providerUrl: PROVIDER, ...IDS, lastTouch: { utmSource: 'google' } }),
    )

    expect(url.searchParams.get('utm_source')).toBeNull()
  })

  test('forwards the last-touch utm set when asked', () => {
    const url = new URL(
      buildBookingUrl({
        providerUrl: PROVIDER,
        ...IDS,
        forwardUtm: true,
        lastTouch: {
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'implants',
          utmTerm: 'dental implants long beach',
          utmContent: 'ad-a',
        },
      }),
    )

    expect(url.searchParams.get('utm_source')).toBe('google')
    expect(url.searchParams.get('utm_medium')).toBe('cpc')
    expect(url.searchParams.get('utm_campaign')).toBe('implants')
    expect(url.searchParams.get('utm_term')).toBe('dental implants long beach')
    expect(url.searchParams.get('utm_content')).toBe('ad-a')
  })

  test('forwarding skips fields the last touch does not carry', () => {
    const url = new URL(
      buildBookingUrl({
        providerUrl: PROVIDER,
        ...IDS,
        forwardUtm: true,
        lastTouch: { utmSource: 'google' },
      }),
    )

    expect(url.searchParams.get('utm_source')).toBe('google')
    expect(url.searchParams.get('utm_campaign')).toBeNull()
  })

  test('forwarding with no last touch at all is a no-op rather than a crash', () => {
    expect(() => buildBookingUrl({ providerUrl: PROVIDER, ...IDS, forwardUtm: true })).not.toThrow()
  })

  test('an unparsable provider url is returned as-is, so a misconfigured site still navigates', () => {
    expect(buildBookingUrl({ providerUrl: '/relative/booking', ...IDS })).toBe('/relative/booking')
  })
})
