import type { ReactElement } from 'react'
import Link from 'next/link'

export interface Crumb {
  readonly label: string
  /** Omit on the final crumb -- the current page is not a link to itself. */
  readonly href?: string
}

export interface BreadcrumbsProps {
  readonly items: readonly Crumb[]
  readonly className?: string
}

const LIST_CLASSES = 'text-muted-foreground flex flex-wrap items-center gap-2 text-sm'

/**
 * The trail from the home page to this one.
 *
 * Renders the visible trail only. The matching `BreadcrumbList` structured
 * data is built separately by `buildBreadcrumbSchema` in `seo` -- the two
 * are kept apart so a page that needs one without the other is not forced
 * into the wrong tag, and so this component stays a server component with
 * no serialisation concerns.
 *
 * The current page is plain text, not a disabled link, and carries
 * `aria-current="page"`; the separators are `aria-hidden` so the trail is
 * announced as a list rather than as "slash".
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps): ReactElement {
  const classes = className ? `${LIST_CLASSES} ${className}` : LIST_CLASSES

  return (
    <nav aria-label="Breadcrumb">
      <ol className={classes}>
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden="true" className="opacity-60">
                /
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-primary underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground font-medium">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
