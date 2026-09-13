import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SocialLinks } from '../../../src/components/content/SocialLinks'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = [
  { label: 'Google', href: 'https://g.page/example', icon: 'G' },
  { label: 'Yelp', href: 'https://yelp.com/biz/example' },
]

afterEach(() => {
  cleanup()
})

describe('SocialLinks', () => {
  test('names every link by its platform even when only an icon shows', () => {
    render(<SocialLinks items={ITEMS} />)

    expect(screen.getByRole('link', { name: /^google/i }).getAttribute('href')).toBe(
      'https://g.page/example',
    )
  })

  test('opens profiles in a new tab without leaking the referrer', () => {
    render(<SocialLinks items={ITEMS} />)

    const link = screen.getByRole('link', { name: /^yelp/i })

    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noreferrer')
  })

  test('names the list', () => {
    render(<SocialLinks items={ITEMS} label="Review us" />)

    expect(screen.getByRole('list', { name: 'Review us' })).toBeDefined()
  })

  test('announces the new tab in the accessible name, since every link leaves the site', () => {
    render(<SocialLinks items={ITEMS} />)

    expect(
      screen.getByRole('link', { name: /google.*opens in new tab/i }),
    ).toBeDefined()
  })

  test('accepts a translated new-tab label', () => {
    render(<SocialLinks items={ITEMS} newTabLabel="(s'ouvre dans un nouvel onglet)" />)

    expect(
      screen.getByRole('link', { name: /google.*nouvel onglet/i }),
    ).toBeDefined()
  })

  test('has no axe violations', async () => {
    const { container } = render(<SocialLinks items={ITEMS} />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
