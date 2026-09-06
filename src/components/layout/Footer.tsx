import type { ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import { Container } from './Container'

export interface FooterLink {
  readonly label: string
  readonly href: string
}

export interface FooterProps {
  readonly links?: readonly FooterLink[]
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
 */
export function Footer({ links = [], copyright, className }: FooterProps): ReactElement {
  const classes = className ? `${FOOTER_CLASSES} ${className}` : FOOTER_CLASSES

  return (
    <footer className={classes}>
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
