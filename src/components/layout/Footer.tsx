import type { ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import { Container } from './Container'

export interface FooterLink {
  readonly label: string
  readonly href: string
}

export interface FooterProps {
  readonly links?: readonly FooterLink[]
  /**
   * Standing information about the business, rendered above the links row:
   * name, address, phone, opening hours.
   *
   * A slot rather than typed fields, because the shape differs per site --
   * a practice wants an `<address>` and a table, a SaaS wants nothing at
   * all. Taking rendered nodes also means a tracked `CallLink` can go here,
   * which matters: the footer phone number is the last thing a visitor sees
   * before giving up on the page, and it was going uncounted.
   *
   * For a local business this is not decoration. Name, address and phone
   * repeated consistently across a site and its listings is the oldest
   * signal in local search, and the footer is where both people and
   * crawlers look for it.
   */
  readonly info?: ReactNode
  /** Copyright / legal line. A slot, not a hardcoded brand string — the consuming site supplies it. */
  readonly copyright?: ReactNode
  readonly className?: string
}

const FOOTER_CLASSES = 'border-border bg-background text-foreground border-t'

/**
 * Site footer landmark. Renders a second `<nav>` only when `links` is
 * non-empty, distinguished from Header's primary navigation by an
 * accessible name so assistive tech can tell the two navigation regions
 * apart.
 *
 * The optional `info` slot sits above that row, separated by a rule, and
 * collapses entirely when unused -- a site with nothing to put there keeps
 * exactly the footer it had before.
 */
export function Footer({ links = [], info, copyright, className }: FooterProps): ReactElement {
  const classes = className ? `${FOOTER_CLASSES} ${className}` : FOOTER_CLASSES

  return (
    <footer className={classes}>
      {info ? <Container className="border-border border-b py-10">{info}</Container> : null}
      <Container className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        {links.length > 0 ? (
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {copyright ? <p className="text-muted-foreground text-sm">{copyright}</p> : null}
      </Container>
    </footer>
  )
}
