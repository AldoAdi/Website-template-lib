import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FeatureGrid } from '../../../src/components/content/FeatureGrid'
import { Card } from '../../../src/components/content/Card'

afterEach(() => {
  cleanup()
})

describe('FeatureGrid', () => {
  test('renders its Card children', () => {
    render(
      <FeatureGrid>
        <Card title="One" body="First." />
        <Card title="Two" body="Second." />
        <Card title="Three" body="Third." />
      </FeatureGrid>,
    )

    expect(screen.getByRole('heading', { name: 'One' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Two' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Three' })).toBeDefined()
  })

  test('lays out with CSS grid utilities carrying the responsive column counts', () => {
    const { container } = render(
      <FeatureGrid>
        <Card title="One" body="First." />
      </FeatureGrid>,
    )

    const grid = container.firstElementChild
    expect(grid?.className).toMatch(/\bgrid\b/)
    expect(grid?.className).toMatch(/grid-cols-1/)
    expect(grid?.className).toMatch(/sm:grid-cols-2/)
    expect(grid?.className).toMatch(/lg:grid-cols-3/)
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    const { container } = render(
      <FeatureGrid>
        <Card title="One" body="First." />
      </FeatureGrid>,
    )

    expect(container.firstElementChild?.className).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
