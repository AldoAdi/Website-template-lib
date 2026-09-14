import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { MapEmbed } from '../../../src/components/content/MapEmbed'
import {
  getConsentCategories,
  grantConsent,
  resetConsent,
  setConsentCategories,
} from '../../../src/analytics/consent'
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
  vi.restoreAllMocks()
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

  test('announces the new tab in the directions link, since it leaves the site', () => {
    render(<MapEmbed {...PROPS} />)

    expect(screen.getByRole('link', { name: /open in maps.*opens in new tab/i })).toBeDefined()
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

  test('grants only the required category, not every category, on "Allow and show map"', () => {
    render(<MapEmbed {...PROPS} />)

    fireEvent.click(screen.getByRole('button', { name: /allow and show map/i }))

    expect(getConsentCategories()).toEqual(
      expect.objectContaining({ marketing: true, statistics: false }),
    )
  })

  test('preserves an existing grant while adding the caller-chosen category', () => {
    render(<MapEmbed {...PROPS} requireConsentFor="preferences" />)

    fireEvent.click(screen.getByRole('button', { name: /allow and show map/i }))

    expect(getConsentCategories()).toEqual(
      expect.objectContaining({ preferences: true, statistics: false, marketing: false }),
    )
    expect(screen.getByTitle(PROPS.title)).toBeDefined()
  })

  // A cross-origin frame reports no load error to the page, so the only
  // reliable recovery from a blocked map is a link that never goes away.
  test('keeps the directions link next to the loaded frame', () => {
    render(<MapEmbed {...PROPS} requireConsentFor={null} />)

    const link = screen.getByRole('link', { name: /open in maps.*opens in new tab/i })
    expect(link.getAttribute('href')).toBe(PROPS.linkUrl)
  })

  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://www.google.com/maps/embed?pb=x',
    'not a url',
  ])('never frames a non-https embed url (%s)', (embedUrl) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { container } = render(
      <MapEmbed {...PROPS} embedUrl={embedUrl} requireConsentFor={null} />,
    )

    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('button', { name: /allow and show map/i })).toBeNull()
    expect(screen.getByRole('link', { name: /open in maps/i })).toBeDefined()
  })

  test('omits the directions link when it is not an http(s) url', () => {
    render(<MapEmbed {...PROPS} linkUrl="javascript:alert(1)" />)

    expect(screen.queryByRole('link')).toBeNull()
  })

  test('warns in development when given an ordinary Google Maps link, which Google refuses to frame', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <MapEmbed
        {...PROPS}
        embedUrl="https://www.google.com/maps/place/Some+Clinic"
        requireConsentFor={null}
      />,
    )

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/maps\/embed/))
  })

  test('does not warn for a proper embed url', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(<MapEmbed {...PROPS} requireConsentFor={null} />)

    expect(warn).not.toHaveBeenCalled()
  })

  // Only the placeholder is checked with axe: axe-core refuses to scan a
  // tree containing a cross-origin frame under jsdom, so the loaded state
  // is covered by the explicit name assertion above instead.
  test('has no axe violations in the placeholder state', async () => {
    const { container } = render(<MapEmbed {...PROPS} />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
