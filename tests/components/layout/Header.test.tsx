import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { Header } from '../../../src/components/layout/Header'
import { mockMatchMedia } from '../../theme/testHelpers'

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

      const controlledId = disclosure.getAttribute('aria-controls')
      expect(controlledId).toBeTruthy()
      expect(document.getElementById(controlledId as string)).toBe(screen.getByRole('navigation'))
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
  })
})
