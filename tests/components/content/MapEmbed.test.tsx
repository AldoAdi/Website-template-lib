import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { MapEmbed } from '../../../src/components/content/MapEmbed'
import { grantConsent, resetConsent, setConsentCategories } from '../../../src/analytics/consent'
import { findAxeViolations } from '../../axeHelpers'

const PROPS = {
  embedUrl: 'https://www.google.com/maps/embed?pb=example',
  linkUrl: 'https://maps.google.com/?q=example',
  title: 'Map to the practice',
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  resetConsent()
  window.localStorage.clear()
})

describe('MapEmbed', () => {
  test('loads no third-party frame before consent', () => {
    const { container } = render(<MapEmbed {...PROPS} />)

    expect(container.querySelector('iframe')).toBeNull()
  })

  test('still gives directions to a visitor who has refused tracking', () => {
    render(<MapEmbed {...PROPS} />)

    const link = screen.getByRole('link', { name: /open in maps/i })

    expect(link.getAttribute('href')).toBe(PROPS.linkUrl)
    expect(link.getAttribute('rel')).toBe('noreferrer')
  })

  test('loads the frame from inside the placeholder once consent is given there', () => {
    const { container } = render(<MapEmbed {...PROPS} />)

    fireEvent.click(screen.getByRole('button', { name: /allow and show map/i }))

    expect(container.querySelector('iframe')).not.toBeNull()
  })

  test('loads the frame when consent was already granted elsewhere', () => {
    const { container } = render(<MapEmbed {...PROPS} />)

    act(() => grantConsent())

    const frame = container.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe(PROPS.embedUrl)
    expect(frame?.getAttribute('title')).toBe(PROPS.title)
  })

  test('stays off for a visitor who allowed statistics but not marketing', () => {
    const { container } = render(<MapEmbed {...PROPS} />)

    act(() => setConsentCategories({ statistics: true }))

    expect(container.querySelector('iframe')).toBeNull()
  })

  test('follows a caller-chosen category', () => {
    const { container } = render(<MapEmbed {...PROPS} requireConsentFor="statistics" />)

    act(() => setConsentCategories({ statistics: true }))

    expect(container.querySelector('iframe')).not.toBeNull()
  })

  test('loads unconditionally only when the caller explicitly opts out of gating', () => {
    const { container } = render(<MapEmbed {...PROPS} requireConsentFor={null} />)

    expect(container.querySelector('iframe')).not.toBeNull()
  })

  test('defers the frame, which is the heaviest thing on the page', () => {
    const { container } = render(<MapEmbed {...PROPS} requireConsentFor={null} />)

    expect(container.querySelector('iframe')?.getAttribute('loading')).toBe('lazy')
  })

  // Only the placeholder is checked with axe: axe-core refuses to scan a
  // tree containing a cross-origin frame under jsdom, so the loaded state
  // is covered by the explicit name assertion above instead.
  test('has no axe violations in the placeholder state', async () => {
    const { container } = render(<MapEmbed {...PROPS} />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
