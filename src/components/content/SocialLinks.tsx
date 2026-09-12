import type { ReactElement, ReactNode } from 'react'

export interface SocialLink {
  /**
   * The platform, spelled the way a person says it: `'Google'`, `'Yelp'`,
   * `'Instagram'`. Used as the link's accessible name, so it is never
   * optional even when only an icon is shown.
   */
  readonly label: string
  readonly href: string
  /** Decorative glyph or inline SVG. Falls back to the label when absent. */
  readonly icon?: ReactNode
}

export interface SocialLinksProps {
  readonly items: readonly SocialLink[]
  /** Names the list. Defaults to `'Find us online'`. */
  readonly label?: string
  readonly className?: string
}

const LIST_CLASSES = 'flex flex-wrap items-center gap-3'

const LINK_CLASSES =
  'border-border text-muted-foreground hover:text-primary inline-flex size-9 items-center justify-center rounded-full border text-sm'

/**
 * Profile links -- review sites, social accounts.
 *
 * For a local practice these are review destinations before they are social
 * accounts, which is why they sit in the footer of the page rather than in
 * the header: sending a visitor to Google Reviews before they have read
 * anything is sending them away.
 *
 * Every link is externally named by its label even when only an icon shows
 * (`sr-only` text, not `aria-label` on a link wrapping an image), and
 * carries `rel="noreferrer"` with `target="_blank"` -- these all leave the
 * site, and `noreferrer` also covers the `window.opener` hole that
 * `noopener` alone used to be needed for.
 */
export function SocialLinks({
  items,
  label = 'Find us online',
  className,
}: SocialLinksProps): ReactElement {
  const classes = className ? `${LIST_CLASSES} ${className}` : LIST_CLASSES

  return (
    <ul aria-label={label} className={classes}>
      {items.map((item) => (
        <li key={item.label}>
          <a href={item.href} target="_blank" rel="noreferrer" className={LINK_CLASSES}>
            {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
            <span className={item.icon ? 'sr-only' : undefined}>{item.label}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
