import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FAQ } from '../../../src/components/content/FAQ'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = [
  { question: 'Do you take my insurance?', answer: 'We accept most major plans.' },
  { question: 'Do you see children?', answer: 'From age three.' },
]

afterEach(() => {
  cleanup()
})

describe('FAQ', () => {
  test('renders each question as a native disclosure, so it works without JavaScript', () => {
    const { container } = render(<FAQ items={ITEMS} />)

    expect(container.querySelectorAll('details')).toHaveLength(2)
    expect(container.querySelectorAll('summary')).toHaveLength(2)
  })

  test('renders questions at h3 by default and at the given level otherwise', () => {
    render(<FAQ items={ITEMS} />)
    expect(
      screen.getByRole('heading', { level: 3, name: 'Do you take my insurance?' }),
    ).toBeDefined()

    cleanup()

    render(<FAQ items={ITEMS} headingLevel="h4" />)
    expect(
      screen.getByRole('heading', { level: 4, name: 'Do you take my insurance?' }),
    ).toBeDefined()
  })

  test('leaves every item closed by default so the whole list stays scannable', () => {
    const { container } = render(<FAQ items={ITEMS} />)

    expect(container.querySelectorAll('details[open]')).toHaveLength(0)
  })

  test('opens only the first item when asked', () => {
    const { container } = render(<FAQ items={ITEMS} defaultOpenFirst />)
    const details = container.querySelectorAll('details')

    expect(details[0]?.hasAttribute('open')).toBe(true)
    expect(details[1]?.hasAttribute('open')).toBe(false)
  })

  test('renders the answer text', () => {
    render(<FAQ items={ITEMS} />)

    expect(screen.getByText('We accept most major plans.')).toBeDefined()
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <FAQ items={ITEMS} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
