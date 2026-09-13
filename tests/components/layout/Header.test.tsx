import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Header } from '../../../src/components/layout/Header'
import { mockMatchMedia } from '../../theme/testHelpers'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]

function renderHeader() {
  return render(
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <Header logo={<span>Acme</span>} links={LINKS} />
    </NextThemesProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.mocked(usePathname).mockReturnValue('/')
})

describe('Header', () => {
  test('renders as the page banner landmark', () => {
    renderHeader()

    expect(screen.getByRole('banner')).toBeDefined()
  })

  test('renders the logo slot as given, never a hardcoded brand string', () => {
    renderHeader()

    expect(screen.getByText('Acme')).toBeDefined()
  })

  test('renders a single named navigation region containing every link', () => {
    renderHeader()

    const navs = screen.getAllByRole('navigation')
    expect(navs).toHaveLength(1)
    expect(navs[0]).toHaveProperty('tagName', 'NAV')

    for (const link of LINKS) {
      expect(screen.getByRole('link', { name: link.label })).toBeDefined()
    }
  })

  test('renders the theme toggle', () => {
    renderHeader()

    expect(screen.getByRole('button', { name: /theme/i })).toBeDefined()
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    renderHeader()

    const header = screen.getByRole('banner')
    expect(header.className + header.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  describe('mobile disclosure toggle', () => {
    function getDisclosureButton() {
      return screen.getByRole('button', { name: /menu/i })
    }

    test('starts collapsed: aria-expanded is false and it names a real accessible control', () => {
      renderHeader()

      const disclosure = getDisclosureButton()
      expect(disclosure.getAttribute('aria-expanded')).toBe('false')
      expect(disclosure.getAttribute('aria-label')).toBeTruthy()

      // The button controls the collapsible panel, not the whole nav: the
      // desktop menu inside that same nav is not what this button expands.
      const controlledId = disclosure.getAttribute('aria-controls')
      expect(controlledId).toBeTruthy()

      const panel = document.getElementById(controlledId as string)
      expect(panel).not.toBeNull()
      expect(screen.getByRole('navigation').contains(panel)).toBe(true)
    })

    test('activating the disclosure button expands it and flips aria-expanded to true', () => {
      renderHeader()

      const disclosure = getDisclosureButton()
      fireEvent.click(disclosure)

      expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    })

    test('activating an expanded disclosure button collapses it again', () => {
      renderHeader()

      const disclosure = getDisclosureButton()
      fireEvent.click(disclosure)
      fireEvent.click(disclosure)

      expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    })

    test('closes the panel when the pathname changes, e.g. a client-side navigation', () => {
      vi.mocked(usePathname).mockReturnValue('/')
      const { rerender } = renderHeader()

      const disclosure = getDisclosureButton()
      fireEvent.click(disclosure)
      expect(disclosure.getAttribute('aria-expanded')).toBe('true')

      vi.mocked(usePathname).mockReturnValue('/about')
      rerender(
        <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
          <Header logo={<span>Acme</span>} links={LINKS} />
        </NextThemesProvider>,
      )

      expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    })

    test('Escape inside the open panel closes it and returns focus to the disclosure button', () => {
      renderHeader()

      const disclosure = getDisclosureButton()
      fireEvent.click(disclosure)

      const controlledId = disclosure.getAttribute('aria-controls') as string
      const panel = document.getElementById(controlledId) as HTMLElement
      const link = panel.querySelector('a[href="/"]') as HTMLElement
      link.focus()

      fireEvent.keyDown(panel, { key: 'Escape' })

      expect(disclosure.getAttribute('aria-expanded')).toBe('false')
      expect(document.activeElement).toBe(disclosure)
    })

    test('Escape with focus still on the disclosure button closes the panel', () => {
      renderHeader()

      const disclosure = getDisclosureButton()
      fireEvent.click(disclosure)
      disclosure.focus()

      fireEvent.keyDown(disclosure, { key: 'Escape' })

      expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    })
  })
})

function renderWithActions(actions?: React.ReactNode) {
  return render(
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <Header logo={<span>Acme</span>} links={LINKS} actions={actions} />
    </NextThemesProvider>,
  )
}

describe('Header actions slot', () => {
  test('renders nothing extra when no actions are given', () => {
    renderWithActions()

    expect(screen.queryByRole('link', { name: 'Call' })).toBeNull()
  })

  test('renders caller-supplied actions beside the navigation', () => {
    renderWithActions(<a href="tel:5624388802">Call</a>)

    expect(screen.getByRole('link', { name: 'Call' }).getAttribute('href')).toBe('tel:5624388802')
  })

  test('keeps actions outside the navigation landmark, since they are not navigation', () => {
    renderWithActions(<a href="/book">Book</a>)

    const nav = screen.getByRole('navigation', { name: 'Primary' })

    expect(nav.querySelector('a[href="/book"]')).toBeNull()
  })
})
