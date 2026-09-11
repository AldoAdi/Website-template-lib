import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SectionHeading } from '../../../src/components/content/SectionHeading'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('SectionHeading', () => {
  test('renders the heading as an h2 by default', () => {
    render(<SectionHeading heading="What we do" />)

    expect(screen.getByRole('heading', { level: 2, name: 'What we do' })).toBeDefined()
  })

  test('renders the heading at the given level', () => {
    render(<SectionHeading heading="What we do" headingLevel="h3" />)

    expect(screen.getByRole('heading', { level: 3, name: 'What we do' })).toBeDefined()
  })

  test('omits eyebrow and lead when not given', () => {
    const { container } = render(<SectionHeading heading="What we do" />)

    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  test('renders eyebrow and lead when given', () => {
    render(<SectionHeading eyebrow="Long Beach" heading="What we do" lead="Six services." />)

    expect(screen.getByText('Long Beach')).toBeDefined()
    expect(screen.getByText('Six services.')).toBeDefined()
  })

  test('puts the id on the heading so a Section can point aria-labelledby at it', () => {
    render(<SectionHeading id="services-heading" heading="What we do" />)

    expect(screen.getByRole('heading', { level: 2 }).getAttribute('id')).toBe('services-heading')
  })

  test('applies the centered layout only when asked', () => {
    const { container: left } = render(<SectionHeading heading="Left" />)
    expect(left.firstElementChild?.className).not.toContain('text-center')

    cleanup()

    const { container: centered } = render(<SectionHeading heading="Centered" align="center" />)
    expect(centered.firstElementChild?.className).toContain('text-center')
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <SectionHeading eyebrow="Eyebrow" heading="Heading" lead="Lead copy." />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
