import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Section } from '../../../src/components/layout/Section'

afterEach(() => {
  cleanup()
})

describe('Section', () => {
  test('renders its children inside a <section> element', () => {
    render(
      <Section>
        <p>content</p>
      </Section>,
    )

    const section = screen.getByText('content').closest('section')
    expect(section).not.toBeNull()
  })

  test('is not exposed as a landmark region when it has no accessible name', () => {
    render(
      <Section>
        <p>content</p>
      </Section>,
    )

    expect(screen.queryByRole('region')).toBeNull()
  })

  test('becomes an accessible "region" landmark once given an aria-label', () => {
    render(
      <Section ariaLabel="Highlights">
        <p>content</p>
      </Section>,
    )

    expect(screen.getByRole('region', { name: 'Highlights' })).toBeDefined()
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    render(
      <Section ariaLabel="Highlights">
        <p>content</p>
      </Section>,
    )

    const section = screen.getByRole('region', { name: 'Highlights' })
    expect(section.className).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
