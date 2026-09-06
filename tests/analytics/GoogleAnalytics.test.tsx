import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

// `@next/third-parties`'s real GoogleAnalytics injects raw <script> tags via
// next/script, which expects a full Next.js app-router head-manager context
// that does not exist in a bare jsdom render. This wrapper's own job is
// purely "render it or don't, based on consent and the measurement id" --
// so the third-party component is stubbed to a simple marker, keeping the
// test focused on our gating logic rather than next/script internals.
const nextGoogleAnalyticsMock = vi.fn((props: { gaId: string }) => (
  <div data-testid="ga-script" data-ga-id={props.gaId} />
))

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: (props: { gaId: string }) => nextGoogleAnalyticsMock(props),
}))

type ConsentModule = typeof import('../../src/analytics/consent')
type GoogleAnalyticsModule = typeof import('../../src/analytics/GoogleAnalytics')

let GoogleAnalytics: GoogleAnalyticsModule['GoogleAnalytics']
let grantConsent: ConsentModule['grantConsent']
let denyConsent: ConsentModule['denyConsent']

const REAL_LOCAL_STORAGE = window.localStorage

beforeEach(async () => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TEST123')
  window.localStorage.clear()
  nextGoogleAnalyticsMock.mockClear()
  ;({ grantConsent, denyConsent } = await import('../../src/analytics/consent'))
  ;({ GoogleAnalytics } = await import('../../src/analytics/GoogleAnalytics'))
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  Object.defineProperty(window, 'localStorage', {
    value: REAL_LOCAL_STORAGE,
    writable: true,
    configurable: true,
  })
})

describe('GoogleAnalytics', () => {
  test('renders nothing while consent is unknown', () => {
    const { container } = render(<GoogleAnalytics />)

    expect(container.innerHTML).toBe('')
    expect(nextGoogleAnalyticsMock).not.toHaveBeenCalled()
  })

  test('renders nothing when consent is denied', () => {
    const { container } = render(<GoogleAnalytics />)

    act(() => {
      denyConsent()
    })

    expect(container.innerHTML).toBe('')
    expect(nextGoogleAnalyticsMock).not.toHaveBeenCalled()
  })

  test('renders the GA script only after consent is granted', () => {
    const { container } = render(<GoogleAnalytics />)

    expect(container.innerHTML).toBe('')

    act(() => {
      grantConsent()
    })

    expect(nextGoogleAnalyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({ gaId: 'G-TEST123' }),
    )
    expect(container.querySelector('[data-testid="ga-script"]')).not.toBeNull()
  })

  test('renders nothing when NEXT_PUBLIC_GA_ID is not configured, even after consent', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '')
    const { container } = render(<GoogleAnalytics />)

    act(() => {
      grantConsent()
    })

    expect(container.innerHTML).toBe('')
    expect(nextGoogleAnalyticsMock).not.toHaveBeenCalled()
  })

  test('an explicit gaId prop overrides the environment variable', () => {
    const { container } = render(<GoogleAnalytics gaId="G-OVERRIDE" />)

    act(() => {
      grantConsent()
    })

    expect(nextGoogleAnalyticsMock).toHaveBeenCalledWith(
      expect.objectContaining({ gaId: 'G-OVERRIDE' }),
    )
    expect(container.querySelector('[data-ga-id="G-OVERRIDE"]')).not.toBeNull()
  })
})
