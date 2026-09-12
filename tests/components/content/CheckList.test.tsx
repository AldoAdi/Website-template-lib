import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CheckList } from '../../../src/components/content/CheckList'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = ['Flexible scheduling', 'Same-day emergencies', 'Most insurance accepted']

afterEach(() => {
  cleanup()
})

describe('CheckList', () => {
  test('renders one list item per claim', () => {
    render(<CheckList items={ITEMS} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(ITEMS.length)
  })

  test('names the list when no nearby heading does', () => {
    render(<CheckList items={ITEMS} label="Why choose us" />)

    expect(screen.getByRole('list', { name: 'Why choose us' })).toBeDefined()
  })

  test('keeps the tick out of the accessible name', () => {
    render(<CheckList items={ITEMS} />)

    const first = screen.getAllByRole('listitem')[0] as HTMLElement

    expect(first.textContent).toContain('Flexible scheduling')
    expect(first.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  test('has no axe violations', async () => {
    const { container } = render(<CheckList items={ITEMS} label="Why choose us" />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
