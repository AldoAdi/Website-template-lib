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

const INFO_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

describe('Footer info slot', () => {
  test('renders nothing extra when no info is given', () => {
    const { container } = render(<Footer links={INFO_LINKS} copyright="© 2026 Acme" />)

    expect(container.querySelectorAll('footer > div')).toHaveLength(1)
  })

  test('renders caller-supplied business details above the links row', () => {
    render(
      <Footer
        links={INFO_LINKS}
        copyright="© 2026 Acme"
        info={<address>4200 E Ocean Blvd</address>}
      />,
    )

    expect(screen.getByText('4200 E Ocean Blvd')).toBeDefined()
  })

  test('keeps the details outside the footer navigation landmark', () => {
    render(<Footer links={INFO_LINKS} info={<a href="tel:5624388802">Call us</a>} />)

    const nav = screen.getByRole('navigation', { name: 'Footer' })

    expect(nav.querySelector('a[href^="tel:"]')).toBeNull()
  })

  test('renders the details even with no links and no copyright', () => {
    render(<Footer info={<p>Open Monday to Friday</p>} />)

    expect(screen.getByText('Open Monday to Friday')).toBeDefined()
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
