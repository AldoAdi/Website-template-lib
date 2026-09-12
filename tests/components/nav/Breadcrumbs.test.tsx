import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Breadcrumbs } from '../../../src/components/nav/Breadcrumbs'
import { findAxeViolations } from '../../axeHelpers'

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Invisalign' },
]

afterEach(() => {
  cleanup()
})

describe('Breadcrumbs', () => {
  test('renders a named navigation landmark holding an ordered list', () => {
    const { container } = render(<Breadcrumbs items={CRUMBS} />)

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeDefined()
    expect(container.querySelector('ol')).not.toBeNull()
  })

  test('links every ancestor', () => {
    render(<Breadcrumbs items={CRUMBS} />)

    expect(screen.getByRole('link', { name: 'Services' }).getAttribute('href')).toBe('/services')
  })

  test('marks the current page rather than linking it to itself', () => {
    render(<Breadcrumbs items={CRUMBS} />)

    expect(screen.queryByRole('link', { name: 'Invisalign' })).toBeNull()
    expect(screen.getByText('Invisalign').getAttribute('aria-current')).toBe('page')
  })

  test('hides the separators from assistive technology', () => {
    const { container } = render(<Breadcrumbs items={CRUMBS} />)

    const separators = container.querySelectorAll('[aria-hidden="true"]')

    expect(separators).toHaveLength(CRUMBS.length - 1)
  })

  test('has no axe violations', async () => {
    const { container } = render(<Breadcrumbs items={CRUMBS} />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
