import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Footer } from '../../../src/components/layout/Footer'

afterEach(() => {
  cleanup()
})

describe('Footer', () => {
  test('renders as the page contentinfo landmark', () => {
    render(<Footer />)

    expect(screen.getByRole('contentinfo')).toBeDefined()
  })

  test('renders no navigation region when no links are given', () => {
    render(<Footer copyright="© 2026" />)

    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByText('© 2026')).toBeDefined()
  })

  test('renders a named navigation region when links are given', () => {
    render(<Footer links={[{ label: 'Privacy', href: '/privacy' }]} />)

    const nav = screen.getByRole('navigation', { name: 'Footer' })
    expect(nav).toBeDefined()
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy')
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    render(<Footer links={[{ label: 'Privacy', href: '/privacy' }]} copyright="© 2026" />)

    const footer = screen.getByRole('contentinfo')
    expect(footer.className).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
