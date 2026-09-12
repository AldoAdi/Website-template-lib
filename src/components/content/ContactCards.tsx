import type { ReactElement, ReactNode } from 'react'
import type { SubHeadingLevel } from '../headingLevel'

export interface ContactCardItem {
  /** Decorative glyph or icon. Rendered `aria-hidden`. */
  readonly icon?: ReactNode
  /** What this card is for: `'Call us'`, `'Appointments'`, `'Visit us'`. */
  readonly title: string
  /**
   * The answer, and the action.
   *
   * Pass a rendered element -- a tracked `CallLink`, a `BookingLink`, an
   * `<address>` -- not a string. The whole point of this row is that each
   * card ends in something clickable, and a plain string is the shape that
   * quietly produces three cards nobody can act on.
   */
  readonly content: ReactNode
}

export interface ContactCardsProps {
  readonly items: readonly ContactCardItem[]
  readonly headingLevel?: SubHeadingLevel
  /** Names the group for assistive technology. Defaults to `'Ways to get in touch'`. */
  readonly label?: string
  readonly className?: string
}

const GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

const CARD_CLASSES =
  'border-border bg-background flex flex-col items-center gap-2 rounded-lg border p-6 text-center'

/**
 * The "how do I reach you" row: call, book, visit.
 *
 * It exists as its own component rather than three `Card`s because these
 * three answers are the page's actual conversion surface and they belong
 * together -- a visitor scanning for a phone number should find all three
 * options at once, not a phone number in the header, a booking button in the
 * hero, and an address in the footer.
 *
 * Three is the natural size but nothing enforces it; the grid reflows for
 * two or four.
 */
export function ContactCards({
  items,
  headingLevel = 'h3',
  label = 'Ways to get in touch',
  className,
}: ContactCardsProps): ReactElement {
  const Heading = headingLevel
  const classes = className ? `${GRID_CLASSES} ${className}` : GRID_CLASSES

  return (
    <ul aria-label={label} className={classes}>
      {items.map((item) => (
        <li key={item.title} className={CARD_CLASSES}>
          {item.icon ? (
            <span aria-hidden="true" className="text-primary text-2xl">
              {item.icon}
            </span>
          ) : null}
          <Heading className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {item.title}
          </Heading>
          <div className="text-base font-semibold">{item.content}</div>
        </li>
      ))}
    </ul>
  )
}
