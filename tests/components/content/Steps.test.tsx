import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Steps } from '../../../src/components/content/Steps'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = [
  { title: 'Book', body: 'Pick a time online.' },
  { title: 'Arrive', body: 'Paperwork is done ahead.' },
  { title: 'Plan', body: 'You leave knowing the cost.' },
]

afterEach(() => {
  cleanup()
})

describe('Steps', () => {
  test('renders an ordered list so the sequence survives without the numerals', () => {
    const { container } = render(<Steps items={ITEMS} />)

    expect(container.querySelector('ol')).not.toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(3)
  })

  test('renders titles at h3 by default and at the given level otherwise', () => {
    render(<Steps items={ITEMS} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Book' })).toBeDefined()

    cleanup()

    render(<Steps items={ITEMS} headingLevel="h4" />)
    expect(screen.getByRole('heading', { level: 4, name: 'Book' })).toBeDefined()
  })

  test('hides the numeral from assistive technology, which already announces the order', () => {
    const { container } = render(<Steps items={ITEMS} />)
    const marker = container.querySelector('li > span')

    expect(marker?.getAttribute('aria-hidden')).toBe('true')
    expect(marker?.textContent).toBe('1')
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <Steps items={ITEMS} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
