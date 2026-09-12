'use client'

import { Fragment, useId, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { MegaMenu } from '../nav/MegaMenu'
import { MobileNavTree } from '../nav/MobileNavTree'
import type { NavItem } from '../nav/types'
import { Container } from './Container'

/**
 * @deprecated Use `NavItem`. Kept as an alias so existing `links` arrays of
 * `{ label, href }` keep type-checking -- that shape is a `NavItem` with no
 * children.
 */
export type HeaderLink = NavItem

export interface HeaderProps {
  /** Brand mark slot -- an image, wordmark, or link; the library never bakes in a brand string. */
  readonly logo: ReactNode
  /**
   * Primary navigation tree. Items with `children` become mega-menu panels
   * on desktop and nested disclosures on mobile; flat `{ label, href }`
   * items render as plain links, so a small site passes what it always did.
   */
  readonly links: readonly NavItem[]
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
  /**
   * Thin utility strip above the header proper -- an address, an offer, a
   * second phone number. Rendered inside the same `<header>` so it scrolls
   * and sticks with it rather than drifting apart.
   *
   * Pass **one** element, not a fragment of several. `Header` is a client
   * component, so a prop handed to it from a server component crosses the
   * RSC boundary and arrives as a serialized array -- which React then
   * warns about having no keys, from inside this component, where a
   * consumer cannot fix it. One wrapper element sidesteps that entirely.
   */
  readonly topBar?: ReactNode
  /**
   * Pins the header to the top of the viewport. Defaults to true: on a page
   * this long the booking action would otherwise be reachable only from the
   * top, which is the one place a visitor who has read enough to decide is
   * guaranteed not to be.
   */
  readonly sticky?: boolean
  readonly className?: string
}

// `relative` so the mobile panel's `absolute top-full` resolves against the
// header rather than against whatever happens to be positioned further up.
const HEADER_CLASSES = 'border-border bg-background text-foreground relative border-b'

// `supports-[backdrop-filter]` so the translucent background only applies
// where the blur behind it actually renders; elsewhere it stays opaque
// rather than showing content sliding under unblurred text.
const STICKY_CLASSES =
  'sticky top-0 z-40 bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur'

const MOBILE_PANEL_CLASSES =
  'border-border bg-background absolute inset-x-0 top-full z-40 max-h-[70vh] overflow-y-auto border-b border-t py-2 shadow-lg'

// Visible below `md`, hidden at `md` and up -- the disclosure button only
// makes sense once the inline nav is collapsed.
const DISCLOSURE_BUTTON_CLASSES = 'md:hidden'

/**
 * Site header landmark: optional utility bar, brand slot, primary
 * navigation, actions, and the theme toggle.
 *
 * There is exactly one `<nav aria-label="Primary">`, and it holds both
 * renderings -- `MegaMenu` at `md` and up, `MobileNavTree` below it, each
 * `display:none` where the other applies. Two `<nav>`s would be two
 * landmarks sharing one name, which is a real violation whenever the
 * stylesheet has not arrived yet; one `<nav>` cannot be.
 *
 * The mobile panel is absolutely positioned against the header rather than
 * appended after it, which is what lets it live inside the same `<nav>` as
 * the inline desktop menu while still dropping below the header bar.
 *
 * Collapsed, that panel carries the `hidden` *attribute*, not a utility
 * class. Two things follow, and both matter: the element stays in the
 * document so the disclosure button's `aria-controls` always names
 * something real (an `aria-controls` pointing at nothing is an invalid
 * attribute value, not a harmless one), and it is removed from the
 * accessibility tree by the user-agent stylesheet rather than by a
 * stylesheet that has to have loaded first -- so the menu's links are never
 * announced twice, even on a first paint with no CSS.
 *
 * Client component: the disclosure needs to remember whether it is open.
 * `Container`, `Section`, and `Footer` stay server components.
 */
export function Header({
  logo,
  links,
  actions,
  topBar,
  sticky = true,
  className,
}: HeaderProps): ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navId = useId()

  const classes = [HEADER_CLASSES, sticky ? STICKY_CLASSES : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <header className={classes}>
      {topBar ? (
        <div className="border-border bg-secondary text-secondary-foreground border-b text-sm">
          <Container className="flex h-9 items-center justify-between gap-4">{topBar}</Container>
        </div>
      ) : null}

      <Container className="h-header flex items-center justify-between gap-4">
        <div className="flex items-center">{logo}</div>

        <nav aria-label="Primary">
          <div className="hidden md:block">
            <MegaMenu items={links} />
          </div>

          <div id={navId} hidden={!isMenuOpen} className={`${MOBILE_PANEL_CLASSES} md:hidden`}>
            <Container>
              <MobileNavTree items={links} />
            </Container>
          </div>
        </nav>

        <div className="flex items-center gap-4">
          {/*
            The keyed Fragment is not decoration. `actions` is rendered by a
            server component and arrives here across the RSC boundary, where
            React cannot stamp it as key-validated the way it does for
            elements created during this render. Sitting bare among siblings
            it is therefore reported at reconciliation as a list child with
            no key -- a warning about a list the consumer never wrote, from
            inside a component they cannot edit. Wrapping it in an element
            created here, with a constant key, ends that.
          */}
          <Fragment key="actions">{actions}</Fragment>
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
    </header>
  )
}
