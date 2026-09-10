import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { grantConsent } from '../../../src/analytics/consent'
import { track } from '../../../src/analytics'
import { TrackingInspector } from '../../../src/components/debug/TrackingInspector'
import { findAxeViolations } from '../../axeHelpers'

const ORIGINAL_GA = process.env.NEXT_PUBLIC_GA_ID

beforeEach(() => {
  window.localStorage.clear()
  window.gtag = vi.fn()
  process.env.NEXT_PUBLIC_GA_ID = 'G-TEST'
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  if (ORIGINAL_GA === undefined) delete process.env.NEXT_PUBLIC_GA_ID
  else process.env.NEXT_PUBLIC_GA_ID = ORIGINAL_GA
  delete window.gtag
  vi.restoreAllMocks()
})

describe('TrackingInspector', () => {
  test('stays hidden by default, so real visitors never see it', () => {
    render(<TrackingInspector />)

    expect(screen.queryByLabelText('Tracking inspector')).toBeNull()
  })

  test('opens when the url carries the debug parameter', () => {
    window.history.replaceState({}, '', '/?debug=tracking')

    render(<TrackingInspector />)

    expect(screen.getByLabelText('Tracking inspector')).toBeDefined()
  })

  test('ignores an unrelated debug value', () => {
    window.history.replaceState({}, '', '/?debug=layout')

    render(<TrackingInspector />)

    expect(screen.queryByLabelText('Tracking inspector')).toBeNull()
  })

  test('an explicit enabled prop overrides the url', () => {
    render(<TrackingInspector enabled />)

    expect(screen.getByLabelText('Tracking inspector')).toBeDefined()
  })

  test('an explicit enabled={false} wins even with the debug parameter set', () => {
    window.history.replaceState({}, '', '/?debug=tracking')

    render(<TrackingInspector enabled={false} />)

    expect(screen.queryByLabelText('Tracking inspector')).toBeNull()
  })

  test('says so when nothing has fired yet', () => {
    render(<TrackingInspector enabled />)

    expect(screen.getByText(/no events yet/i)).toBeDefined()
  })

  test('shows an event and its properties as it is sent', () => {
    grantConsent()
    render(<TrackingInspector enabled />)

    act(() => {
      track('booking_handoff', { session_id: 'sid-1' })
    })

    expect(screen.getByText('booking_handoff')).toBeDefined()
    expect(screen.getByText(/sid-1/)).toBeDefined()
    expect(screen.getByText(/sent via ga4/i)).toBeDefined()
  })

  test('marks an event the consent gate held back, rather than pretending it sent', () => {
    render(<TrackingInspector enabled />)

    act(() => {
      track('cta_click', { cta_location: 'hero' })
    })

    expect(screen.getByText(/queued \(no consent\)/i)).toBeDefined()
  })

  test('shows newest first', () => {
    grantConsent()
    render(<TrackingInspector enabled />)

    act(() => {
      track('booking_view', {})
      track('booking_handoff', {})
    })

    const names = screen.getAllByText(/^booking_/).map((node) => node.textContent)
    expect(names).toEqual(['booking_handoff', 'booking_view'])
  })

  test('reports the consent state in the header', () => {
    render(<TrackingInspector enabled />)
    expect(screen.getByText(/consent:unknown/)).toBeDefined()

    act(() => {
      grantConsent()
    })
    expect(screen.getByText(/consent:granted/)).toBeDefined()
  })

  test('has no axe violations', async () => {
    grantConsent()
    const { container } = render(<TrackingInspector enabled />)

    act(() => {
      track('cta_click', { cta_location: 'hero' })
    })

    expect(await findAxeViolations(container)).toEqual([])
  })
})
