import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PageHeader } from '../../../src/components/content/PageHeader'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('PageHeader', () => {
  test('owns the page h1', () => {
    render(<PageHeader heading="Invisalign" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Invisalign' })).toBeDefined()
  })

  test('renders the trail when one is given, and nothing when it is not', () => {
    const { unmount } = render(
      <PageHeader
        heading="Invisalign"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Invisalign' }]}
      />,
    )
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeDefined()

    unmount()
    render(<PageHeader heading="Invisalign" />)

    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).toBeNull()
  })

  test('renders eyebrow, lead and actions when supplied', () => {
    render(
      <PageHeader
        eyebrow="Cosmetic dentistry"
        heading="Invisalign"
        lead="Clear aligners, fitted here."
        actionSlot={<a href="/book">Book</a>}
      />,
    )

    expect(screen.getByText('Cosmetic dentistry')).toBeDefined()
    expect(screen.getByText('Clear aligners, fitted here.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Book' })).toBeDefined()
  })

  test('has no axe violations', async () => {
    const { container } = render(
      <PageHeader
        heading="Invisalign"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Invisalign' }]}
        lead="Clear aligners."
      />,
    )

    expect(await findAxeViolations(container)).toEqual([])
  })
})
