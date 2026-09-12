import type { ReactElement, ReactNode } from 'react'

export interface CheckListProps {
  readonly items: readonly ReactNode[]
  /** Names the list for assistive technology when no nearby heading does. */
  readonly label?: string
  readonly className?: string
}

const LIST_CLASSES = 'flex flex-col gap-3'

const ITEM_CLASSES = 'flex items-start gap-3 text-pretty'

/**
 * A short list of claims, each with a tick.
 *
 * The tick is a CSS-drawn `aria-hidden` glyph rather than an icon per item,
 * because it carries no information a screen reader needs: the list is
 * already a list, and "checkmark, flexible scheduling" is worse than
 * "flexible scheduling". The visual job -- making three benefits scannable
 * in the second the visitor gives them -- is done entirely by the shape.
 */
export function CheckList({ items, label, className }: CheckListProps): ReactElement {
  const classes = className ? `${LIST_CLASSES} ${className}` : LIST_CLASSES

  return (
    <ul aria-label={label} className={classes}>
      {items.map((item, index) => (
        <li key={index} className={ITEM_CLASSES}>
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs"
          >
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
