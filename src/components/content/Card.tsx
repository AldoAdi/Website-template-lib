import type { ReactElement, ReactNode } from 'react'
import Link from 'next/link'

export type CardHeadingLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface CardProps {
  /**
   * Decorative visual slot. Rendered `aria-hidden` so a consumer-supplied
   * icon (an inline SVG, an icon component) never surfaces as an unnamed
   * interactive element or duplicates the card's accessible name.
   */
  readonly icon?: ReactNode
  readonly title: string
  readonly body: ReactNode
  /** When given, the whole card becomes a single clickable link named by `title`. */
  readonly href?: string
  /** Heading level for the title, so a page can keep a sane heading order. Defaults to `h3`. */
  readonly headingLevel?: CardHeadingLevel
  readonly className?: string
}

const CARD_CLASSES =
  'relative flex flex-col gap-4 rounded-lg border border-border bg-background p-6 text-foreground'

// Stretches the title link's hit area over the whole card via a pseudo-
// element, rather than wrapping other interactive content in an `<a>` or
// attaching a click handler to a non-interactive element. The accessibility
// tree still sees exactly one link, named by the title text.
const STRETCHED_LINK_CLASSES = 'after:absolute after:inset-0 hover:text-primary'

/**
 * Content card: icon slot, title, body, and an optional link. When `href`
 * is given, the entire card is clickable through a single real link on the
 * title -- the accepted technique for a "clickable card" that stays
 * accessible: one interactive element, named by the title, its hit area
 * stretched over the card with `after:absolute after:inset-0`.
 */
export function Card({
  icon,
  title,
  body,
  href,
  headingLevel = 'h3',
  className,
}: CardProps): ReactElement {
  const Heading = headingLevel
  const classes = className ? `${CARD_CLASSES} ${className}` : CARD_CLASSES

  return (
    <div className={classes}>
      {icon ? (
        <span aria-hidden="true" className="text-primary">
          {icon}
        </span>
      ) : null}
      <Heading className="text-lg font-semibold">
        {href ? (
          <Link href={href} className={STRETCHED_LINK_CLASSES}>
            {title}
          </Link>
        ) : (
          title
        )}
      </Heading>
      <div className="text-muted-foreground text-sm">{body}</div>
    </div>
  )
}
