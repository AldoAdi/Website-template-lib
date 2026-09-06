import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CTA } from '../../../src/components/content/CTA'
import { findAxeViolations } from '../../axeHelpers'

const ACTION = { label: 'Talk to sales', href: '/contact' }

afterEach(() => {
  cleanup()
})

describe('CTA', () => {
  test('renders the heading as an h2 by default', () => {
    render(<CTA heading="Ready to grow?" body="Get in touch this week." action={ACTION} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Ready to grow?' })).toBeDefined()
  })

  test('renders the heading at the given heading level', () => {
    render(
      <CTA
        heading="Ready to grow?"
        headingLevel="h3"
        body="Get in touch this week."
        action={ACTION}
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Ready to grow?' })).toBeDefined()
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  test('renders body copy and exactly one action', () => {
    render(<CTA heading="Ready to grow?" body="Get in touch this week." action={ACTION} />)

    expect(screen.getByText('Get in touch this week.')).toBeDefined()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute('href')).toBe('/contact')
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    const { container } = render(
      <CTA heading="Ready to grow?" body="Get in touch this week." action={ACTION} />,
    )

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <h1>Acme</h1>
        <CTA heading="Ready to grow?" body="Get in touch this week." action={ACTION} />
      </main>,
    )

    const violations = await findAxeViolations(document.body)

    expect(violations).toEqual([])
  })
})
