import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { Container } from '../../../src/components/layout/Container'
import { Footer } from '../../../src/components/layout/Footer'
import { Header } from '../../../src/components/layout/Header'
import { Section } from '../../../src/components/layout/Section'
import { mockMatchMedia } from '../../theme/testHelpers'
import { findAxeViolations } from '../../axeHelpers'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]

const FOOTER_LINKS = [{ label: 'Privacy', href: '/privacy' }]

// The whole shell, assembled the way a consuming site assembles it. Axe's
// landmark rules are page-level -- they only mean something when the parts
// are rendered together, so this is checked as one tree rather than
// component by component.
function renderShell() {
  return render(
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <Header logo={<span>Acme</span>} links={NAV_LINKS} />
      <main>
        <Section ariaLabel="Introduction">
          <Container>
            <h1>Acme</h1>
            <p>Body copy.</p>
          </Container>
        </Section>
      </main>
      <Footer links={FOOTER_LINKS} copyright="© 2026 Acme" />
    </NextThemesProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
})

describe('layout shell accessibility', () => {
  test('has no axe violations with the mobile nav collapsed', async () => {
    renderShell()

    const violations = await findAxeViolations(document.body)

    expect(violations).toEqual([])
  })

  test('has no axe violations with the mobile nav expanded', async () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))

    const violations = await findAxeViolations(document.body)

    expect(violations).toEqual([])
  })

  test('exposes both navigation regions under distinct accessible names', () => {
    renderShell()

    const navNames = screen.getAllByRole('navigation').map((nav) => nav.getAttribute('aria-label'))

    expect(navNames).toEqual(['Primary', 'Footer'])
    expect(new Set(navNames).size).toBe(navNames.length)
  })
})
