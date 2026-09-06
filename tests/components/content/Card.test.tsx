import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Card } from '../../../src/components/content/Card'

afterEach(() => {
  cleanup()
})

describe('Card', () => {
  test('renders title, body, and heading level', () => {
    render(<Card title="Fast" body="Ships in minutes." headingLevel="h2" />)

    const heading = screen.getByRole('heading', { level: 2, name: 'Fast' })
    expect(heading).toBeDefined()
    expect(screen.getByText('Ships in minutes.')).toBeDefined()
  })

  test('defaults to an h3 heading when no level is given', () => {
    render(<Card title="Fast" body="Ships in minutes." />)

    expect(screen.getByRole('heading', { level: 3, name: 'Fast' })).toBeDefined()
  })

  test('renders no link when href is omitted', () => {
    const { container } = render(<Card title="Fast" body="Ships in minutes." />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelectorAll('a, button, [tabindex]')).toHaveLength(0)
  })

  test('is clickable through exactly one interactive element, named by the title', () => {
    const { container } = render(
      <Card title="Fast" body="Ships in minutes." href="/features/fast" />,
    )

    // Whole-card-clickable must resolve to a single real interactive
    // element in the accessibility tree -- never a link wrapping other
    // interactive content, and never a click handler on a <div>.
    const interactive = container.querySelectorAll('a, button, [role="link"], [role="button"]')
    expect(interactive).toHaveLength(1)

    const link = screen.getByRole('link', { name: 'Fast' })
    expect(link.getAttribute('href')).toBe('/features/fast')
  })

  test('does not let a decorative icon become an unnamed interactive element', () => {
    const { container } = render(
      <Card
        title="Fast"
        body="Ships in minutes."
        href="/features/fast"
        icon={<svg data-testid="icon" />}
      />,
    )

    expect(container.querySelectorAll('a, button, [role="link"], [role="button"]')).toHaveLength(1)
    const iconWrapper = screen.getByTestId('icon').parentElement
    expect(iconWrapper?.getAttribute('aria-hidden')).toBe('true')
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    const { container } = render(
      <Card title="Fast" body="Ships in minutes." href="/features/fast" icon={<svg />} />,
    )

    for (const element of container.querySelectorAll('[class]')) {
      expect(element.className).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    }
  })
})
