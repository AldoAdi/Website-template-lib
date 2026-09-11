import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LogoStrip } from '../../../src/components/content/LogoStrip'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('LogoStrip', () => {
  test('names the list so the group is announced with its purpose', () => {
    render(<LogoStrip label="Insurance accepted" items={['Delta Dental', 'Cigna']} />)

    expect(screen.getByRole('list', { name: 'Insurance accepted' })).toBeDefined()
  })

  test('renders one item per entry', () => {
    render(<LogoStrip label="Insurance accepted" items={['Delta Dental', 'Cigna', 'MetLife']} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  test('accepts rendered nodes as well as plain wordmarks', () => {
    render(
      <LogoStrip
        label="Insurance accepted"
        items={[<svg key="a" role="img" aria-label="Delta Dental" />]}
      />,
    )

    expect(screen.getByRole('img', { name: 'Delta Dental' })).toBeDefined()
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <LogoStrip label="Insurance accepted" items={['Delta Dental', 'Cigna']} />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
