import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Hero } from '../../../src/components/content/Hero'
import { findAxeViolations } from '../../axeHelpers'

const PRIMARY_ACTION = { label: 'Get started', href: '/signup' }
const SECONDARY_ACTION = { label: 'Learn more', href: '/about' }

afterEach(() => {
  cleanup()
})

describe('Hero', () => {
  test('renders the headline as an h1 by default', () => {
    render(<Hero headline="Build faster" primaryAction={PRIMARY_ACTION} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Build faster' })).toBeDefined()
  })

  test('renders the headline at the given heading level', () => {
    render(<Hero headline="Build faster" headingLevel="h2" primaryAction={PRIMARY_ACTION} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Build faster' })).toBeDefined()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  test('renders only the primary action when optional props are omitted', () => {
    render(<Hero headline="Build faster" primaryAction={PRIMARY_ACTION} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('img')).toBeNull()
  })

  test('renders eyebrow, subhead, secondary action, and image when given', () => {
    render(
      <Hero
        eyebrow="New"
        headline="Build faster"
        subhead="Ship in days, not months."
        primaryAction={PRIMARY_ACTION}
        secondaryAction={SECONDARY_ACTION}
        image={<span role="img" aria-label="Product screenshot" />}
      />,
    )

    expect(screen.getByText('New')).toBeDefined()
    expect(screen.getByText('Ship in days, not months.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Get started' }).getAttribute('href')).toBe('/signup')
    expect(screen.getByRole('link', { name: 'Learn more' }).getAttribute('href')).toBe('/about')
    expect(screen.getByRole('img', { name: 'Product screenshot' })).toBeDefined()
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    const { container } = render(<Hero headline="Build faster" primaryAction={PRIMARY_ACTION} />)

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <Hero
          eyebrow="New"
          headline="Build faster"
          subhead="Ship in days, not months."
          primaryAction={PRIMARY_ACTION}
          secondaryAction={SECONDARY_ACTION}
          image={<span role="img" aria-label="Product screenshot" />}
        />
      </main>,
    )

    const violations = await findAxeViolations(document.body)

    expect(violations).toEqual([])
  })
})
