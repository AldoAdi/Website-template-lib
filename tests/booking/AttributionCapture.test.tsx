import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { AttributionCapture } from '../../src/booking/AttributionCapture'
import { getAttribution } from '../../src/booking/attribution'

beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  vi.restoreAllMocks()
})

describe('AttributionCapture', () => {
  test('records the ad click that landed on this page', () => {
    window.history.replaceState({}, '', '/?utm_source=google&utm_campaign=implants&gclid=ABC')

    render(<AttributionCapture />)

    const { firstTouch, lastTouch } = getAttribution()
    expect(firstTouch.gclid).toBe('ABC')
    expect(lastTouch.utmCampaign).toBe('implants')
  })

  test('renders nothing', () => {
    const { container } = render(<AttributionCapture />)

    expect(container.innerHTML).toBe('')
  })

  test('a page with no campaign parameters leaves stored attribution alone', () => {
    window.history.replaceState({}, '', '/?gclid=ABC')
    const first = render(<AttributionCapture />)
    first.unmount()

    window.history.replaceState({}, '', '/services/')
    render(<AttributionCapture />)

    expect(getAttribution().lastTouch.gclid).toBe('ABC')
  })

  test('records once even when the effect runs twice', () => {
    window.history.replaceState({}, '', '/?utm_source=google')
    const { rerender } = render(<AttributionCapture />)
    const firstCapturedAt = getAttribution().firstTouch.capturedAt

    rerender(<AttributionCapture />)

    expect(getAttribution().firstTouch.capturedAt).toBe(firstCapturedAt)
  })
})
