import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { MegaMenu } from '../../../src/components/nav/MegaMenu'
import type { NavItem } from '../../../src/components/nav/types'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Services',
    href: '/services',
    items: [
      {
        label: 'General dentistry',
        href: '/services/general',
        items: [{ label: 'Cleanings', href: '/services/general/cleanings' }],
      },
      { label: 'Invisalign', href: '/services/invisalign', description: 'Clear aligners' },
    ],
  },
]

afterEach(() => {
  cleanup()
})

describe('MegaMenu', () => {
  test('renders a childless item as an ordinary link, not a button', () => {
    render(<MegaMenu items={ITEMS} />)

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
  })

  test('renders a group as a disclosure button, not a menu role', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('keeps the panel out of the document until it is opened', () => {
    render(<MegaMenu items={ITEMS} />)

    expect(screen.queryByRole('link', { name: 'Invisalign' })).toBeNull()
  })

  test('opening a group reveals its sub-items and their own sub-items', () => {
    render(<MegaMenu items={ITEMS} />)

    fireEvent.click(screen.getByRole('button', { name: /services/i }))

    expect(screen.getByRole('link', { name: 'General dentistry' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Cleanings' })).toBeDefined()
    expect(screen.getByText('Clear aligners')).toBeDefined()
  })

  test('the open trigger names the panel it controls', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.click(trigger)

    const panelId = trigger.getAttribute('aria-controls') as string

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(panelId)).not.toBeNull()
  })

  test('a second activation closes the panel again', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.click(trigger)
    fireEvent.click(trigger)

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  test('Escape closes the panel and returns focus to its trigger', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  test('a pointer press outside the bar closes the panel', () => {
    render(<MegaMenu items={ITEMS} />)

    fireEvent.click(screen.getByRole('button', { name: /services/i }))
    fireEvent.pointerDown(document.body)

    expect(screen.getByRole('button', { name: /services/i }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })

  test('hovering a group opens it for mouse users', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.mouseEnter(trigger.parentElement as HTMLElement)

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  test('has no axe violations with a panel open', async () => {
    const { container } = render(
      <nav aria-label="Primary">
        <MegaMenu items={ITEMS} />
      </nav>,
    )
    fireEvent.click(screen.getByRole('button', { name: /services/i }))

    expect(await findAxeViolations(container)).toEqual([])
  })
})
