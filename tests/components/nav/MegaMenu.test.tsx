import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MegaMenu } from '../../../src/components/nav/MegaMenu'
import type { NavItem } from '../../../src/components/nav/types'
import { findAxeViolations } from '../../axeHelpers'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

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
  vi.mocked(usePathname).mockReturnValue('/')
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
    fireEvent.pointerEnter(trigger.parentElement as HTMLElement, { pointerType: 'mouse' })

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  test('a click right after a hover-open keeps the panel open, not toggles it closed', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.pointerEnter(trigger.parentElement as HTMLElement, { pointerType: 'mouse' })
    fireEvent.click(trigger)

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  test('a touch tap opens the panel, since touch never sets the hover-opened flag', () => {
    render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.pointerEnter(trigger.parentElement as HTMLElement, { pointerType: 'touch' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(trigger)

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  test('right-anchors the panel for a trigger in the right half of the bar, to stay on screen', () => {
    const manyItems: readonly NavItem[] = [
      { label: 'First', items: [{ label: 'First child', href: '/first/child' }] },
      { label: 'Second', items: [{ label: 'Second child', href: '/second/child' }] },
      { label: 'Third', items: [{ label: 'Third child', href: '/third/child' }] },
      { label: 'Fourth', items: [{ label: 'Fourth child', href: '/fourth/child' }] },
    ]
    render(<MegaMenu items={manyItems} />)

    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    const firstPanel = screen.getByRole('link', { name: 'First child' }).closest('div')
    expect(firstPanel?.className).toContain('left-0')
    expect(firstPanel?.className).not.toContain('right-0')

    fireEvent.click(screen.getByRole('button', { name: 'Fourth' }))
    const lastPanel = screen.getByRole('link', { name: 'Fourth child' }).closest('div')
    expect(lastPanel?.className).toContain('right-0')
    expect(lastPanel?.className).toContain('left-auto')
  })

  test('closes an open panel when the pathname changes, e.g. a client-side navigation', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const { rerender } = render(<MegaMenu items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: /services/i })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    vi.mocked(usePathname).mockReturnValue('/about')
    rerender(<MegaMenu items={ITEMS} />)

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
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

  test('a top-level item with neither href nor sub-items renders as a plain label, not a link', () => {
    render(<MegaMenu items={[{ label: 'Resources' }]} />)

    expect(screen.queryByRole('link', { name: 'Resources' })).toBeNull()
    expect(screen.getByText('Resources')).toBeDefined()
  })

  test('a leaf sub-item with no href renders as a plain label, not a link', () => {
    const itemsWithLabelLeaf: readonly NavItem[] = [
      {
        label: 'Services',
        items: [{ label: 'General dentistry', items: [{ label: 'Fluoride treatments' }] }],
      },
    ]
    render(<MegaMenu items={itemsWithLabelLeaf} />)

    fireEvent.click(screen.getByRole('button', { name: /services/i }))

    expect(screen.queryByRole('link', { name: 'Fluoride treatments' })).toBeNull()
    expect(screen.getByText('Fluoride treatments')).toBeDefined()
  })

  test('duplicate leaf labels within one panel column emit no React key warning', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const itemsWithDuplicateLeaves: readonly NavItem[] = [
      {
        label: 'Services',
        items: [
          {
            label: 'General dentistry',
            items: [
              { label: 'Overview', href: '/a' },
              { label: 'Overview', href: '/b' },
            ],
          },
        ],
      },
    ]
    render(<MegaMenu items={itemsWithDuplicateLeaves} />)

    fireEvent.click(screen.getByRole('button', { name: /services/i }))

    const keyWarning = consoleError.mock.calls.some((call) =>
      String(call[0]).includes('unique "key" prop'),
    )
    expect(keyWarning).toBe(false)
    consoleError.mockRestore()
  })
})
