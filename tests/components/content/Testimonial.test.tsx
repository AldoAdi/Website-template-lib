import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Testimonial } from '../../../src/components/content/Testimonial'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('Testimonial', () => {
  test('renders the quote and the attribution', () => {
    render(<Testimonial quote="They explained everything." author="Maria G." />)

    expect(screen.getByText('They explained everything.')).toBeDefined()
    expect(screen.getByText('Maria G.')).toBeDefined()
  })

  test('renders the optional detail line', () => {
    render(<Testimonial quote="Great." author="Maria G." detail="Patient since 2019" />)

    expect(screen.getByText('Patient since 2019')).toBeDefined()
  })

  test('omits the rating entirely when none is given', () => {
    render(<Testimonial quote="Great." author="Maria G." />)

    expect(screen.queryByText(/Rated/)).toBeNull()
  })

  test('announces the rating once, in words', () => {
    render(<Testimonial quote="Great." author="Maria G." rating={5} />)

    expect(screen.getByText('Rated 5 out of 5')).toBeDefined()
  })

  test('rounds and clamps an out-of-range rating rather than rendering nonsense', () => {
    render(<Testimonial quote="Great." author="Maria G." rating={9} />)

    expect(screen.getByText('Rated 5 out of 5')).toBeDefined()

    cleanup()

    render(<Testimonial quote="Great." author="Maria G." rating={-3} />)

    expect(screen.getByText('Rated 0 out of 5')).toBeDefined()
  })

  test('emits no rating structured data', () => {
    const { container } = render(<Testimonial quote="Great." author="Maria G." rating={5} />)

    expect(container.querySelector('script')).toBeNull()
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <Testimonial quote="Great." author="Maria G." detail="Patient" rating={4} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
