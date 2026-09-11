import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { HoursTable } from '../../../src/components/content/HoursTable'
import { findAxeViolations } from '../../axeHelpers'

const ROWS = [
  { days: 'Mon – Wed', hours: '8:00am – 5:00pm' },
  { days: 'Friday', hours: 'Closed', closed: true },
]

afterEach(() => {
  cleanup()
})

describe('HoursTable', () => {
  test('renders a real table with a caption', () => {
    render(<HoursTable rows={ROWS} />)

    expect(screen.getByRole('table', { name: 'Opening hours' })).toBeDefined()
  })

  test('accepts a custom caption', () => {
    render(<HoursTable rows={ROWS} caption="When we are open" />)

    expect(screen.getByRole('table', { name: 'When we are open' })).toBeDefined()
  })

  test('makes the day a row header so the pairing survives in a screen reader', () => {
    const { container } = render(<HoursTable rows={ROWS} />)
    const header = container.querySelector('th')

    expect(header?.getAttribute('scope')).toBe('row')
    expect(header?.textContent).toBe('Mon – Wed')
  })

  test('mutes a closed row from the explicit flag, not by matching the text', () => {
    const { container } = render(<HoursTable rows={ROWS} />)
    const rows = container.querySelectorAll('tbody tr')

    expect(rows[0]?.className ?? '').not.toContain('text-muted-foreground')
    expect(rows[1]?.className ?? '').toContain('text-muted-foreground')
  })

  test('renders no open-now badge, which would need a timezone it does not have', () => {
    render(<HoursTable rows={ROWS} />)

    expect(screen.queryByText(/open now/i)).toBeNull()
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <HoursTable rows={ROWS} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
