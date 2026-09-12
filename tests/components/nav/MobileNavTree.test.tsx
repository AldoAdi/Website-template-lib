import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MobileNavTree } from '../../../src/components/nav/MobileNavTree'
import type { NavItem } from '../../../src/components/nav/types'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Services',
    href: '/services',
    items: [
      { label: 'Invisalign', href: '/services/invisalign' },
      {
        label: 'General dentistry',
        href: '/services/general',
        items: [{ label: 'Cleanings', href: '/services/general/cleanings' }],
      },
    ],
  },
]

afterEach(() => {
  cleanup()
})

describe('MobileNavTree', () => {
  test('renders a group as a native disclosure, so it needs no client state', () => {
    const { container } = render(<MobileNavTree items={ITEMS} />)

    const details = container.querySelector('details')

    expect(details).not.toBeNull()
    expect(details?.querySelector('summary')?.textContent).toContain('Services')
  })

  test('renders a childless item as a plain link', () => {
    render(<MobileNavTree items={ITEMS} />)

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
  })

  test('offers the group page itself, which a heading alone would hide', () => {
    render(<MobileNavTree items={ITEMS} />)

    expect(screen.getByRole('link', { name: /all services/i }).getAttribute('href')).toBe(
      '/services',
    )
  })

  test('nests arbitrarily deep rather than flattening the tree', () => {
    render(<MobileNavTree items={ITEMS} />)

    expect(screen.getByRole('link', { name: 'Cleanings' }).getAttribute('href')).toBe(
      '/services/general/cleanings',
    )
  })

  test('has no axe violations', async () => {
    const { container } = render(
      <nav aria-label="Primary">
        <MobileNavTree items={ITEMS} />
      </nav>,
    )

    expect(await findAxeViolations(container)).toEqual([])
  })
})
