import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { TrustBar } from '../../../src/components/content/TrustBar'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = [
  { value: '4.9', label: 'Google rating' },
  { value: 'Since 2008', label: 'Serving Long Beach' },
]

afterEach(() => {
  cleanup()
})

describe('TrustBar', () => {
  test('renders each pair as a term and its description', () => {
    const { container } = render(<TrustBar items={ITEMS} />)

    expect(container.querySelectorAll('dt')).toHaveLength(2)
    expect(container.querySelectorAll('dd')).toHaveLength(2)
    expect(screen.getByText('Google rating')).toBeDefined()
    expect(screen.getByText('4.9')).toBeDefined()
  })

  test('keeps the label first in the DOM so the pairing reads correctly', () => {
    const { container } = render(<TrustBar items={ITEMS} />)
    const firstGroup = container.querySelector('dl > div')

    expect(firstGroup?.children[0]?.tagName).toBe('DT')
    expect(firstGroup?.children[1]?.tagName).toBe('DD')
  })

  test('renders nothing but the list when given no items', () => {
    const { container } = render(<TrustBar items={[]} />)

    expect(container.querySelectorAll('dt')).toHaveLength(0)
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <TrustBar items={ITEMS} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
