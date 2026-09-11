'use client'

import { useId, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { Container } from './Container'

export interface HeaderLink {
  readonly label: string
  readonly href: string
}

export interface HeaderProps {
  /** Brand mark slot -- an image, wordmark, or link; the library never bakes in a brand string. */
  readonly logo: ReactNode
  readonly links: readonly HeaderLink[]
  /**
   * Persistent actions kept beside the navigation -- a phone number, a
   * booking button.
   *
   * Separate from `links` because these are not navigation: they are the
   * conversion, and they need to be reachable from every scroll position
   * rather than only from the hero the visitor scrolled past. The slot takes
   * rendered elements so a tracked `CallLink` or `BookingLink` can go here;
   * `links` renders plain anchors and would record nothing.
   *
   * Give the contents their own responsive classes. On a narrow screen there
   * is room for roughly one action beside the menu button, and
   * `StickyCallBar` is the better answer there.
   */
  readonly actions?: ReactNode
  readonly className?: string
}

const HEADER_CLASSES = 'border-border bg-background text-foreground border-b'

// Visible below `md`, hidden at `md` and up -- the disclosure button only
// makes sense once the inline nav is collapsed.
const DISCLOSURE_BUTTON_CLASSES = 'md:hidden'

/**
 * Site header landmark: brand slot, primary navigation, and the theme
 * toggle. Below the `md` breakpoint the nav collapses behind a disclosure
 * button; a single `<nav>` element is used for both layouts (its visibility
 * is driven by the same open state that drives the button's
 * `aria-expanded`), rather than rendering two `<nav>`s and hiding one with
 * CSS, so the navigation region never doubles up in the accessibility tree.
 *
 * Client component: the disclosure needs to remember whether it is open.
 * `Container`, `Section`, and `Footer` stay server components.
 */
export function Header({ logo, links, actions, className }: HeaderProps): ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navId = useId()

  const classes = className ? `${HEADER_CLASSES} ${className}` : HEADER_CLASSES
  const navClasses = isMenuOpen
    ? 'block border-t border-border py-4 md:border-0 md:py-0'
    : 'hidden md:block'

  return (
    <header className={classes}>
      <Container className="flex h-header items-center justify-between gap-4">
        <div className="flex items-center">{logo}</div>

        <div className="flex items-center gap-4">
          {actions}
          <ThemeToggle />
          <button
            type="button"
            className={DISCLOSURE_BUTTON_CLASSES}
            aria-expanded={isMenuOpen}
            aria-controls={navId}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </Container>

      <nav id={navId} aria-label="Primary" className={navClasses}>
        <Container>
          <ul className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </header>
  )
}
