import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ContactCards } from '../../../src/components/content/ContactCards'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = [
  { icon: '☎', title: 'Call us', content: <a href="tel:5624388802">+1 562-438-8802</a> },
  { title: 'Appointments', content: <a href="/book">Book appointment</a> },
  { title: 'Visit us', content: <address>5580 2nd St</address> },
]

afterEach(() => {
  cleanup()
})

describe('ContactCards', () => {
  test('renders one card per way of getting in touch', () => {
    render(<ContactCards items={ITEMS} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  test('keeps each card ending in something actionable', () => {
    render(<ContactCards items={ITEMS} />)

    expect(screen.getByRole('link', { name: '+1 562-438-8802' }).getAttribute('href')).toBe(
      'tel:5624388802',
    )
    expect(screen.getByRole('link', { name: 'Book appointment' })).toBeDefined()
  })

  test('titles sit at h3 by default and follow the caller otherwise', () => {
    const { unmount } = render(<ContactCards items={ITEMS} />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)

    unmount()
    render(<ContactCards items={ITEMS} headingLevel="h4" />)

    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3)
  })

  test('names the group for assistive technology', () => {
    render(<ContactCards items={ITEMS} label="How to reach us" />)

    expect(screen.getByRole('list', { name: 'How to reach us' })).toBeDefined()
  })

  test('has no axe violations', async () => {
    const { container } = render(<ContactCards items={ITEMS} />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
