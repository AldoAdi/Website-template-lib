import type { ReactElement, ReactNode } from 'react'

export interface TrustItem {
  /** The number or short claim, e.g. `'4.9'` or `'Since 2008'`. */
  readonly value: ReactNode
  /** What the value means, e.g. `'Google rating'`. */
  readonly label: ReactNode
}

export interface TrustBarProps {
  readonly items: readonly TrustItem[]
  readonly className?: string
}

const TRUST_BAR_CLASSES =
  'grid grid-cols-2 gap-6 rounded-lg border border-border bg-secondary p-6 sm:grid-cols-4'

/**
 * A row of proof points -- years in practice, rating, patient count.
 *
 * Rendered as a description list because that is what these pairs are, and
 * the pairing survives when the visual layout does not: a screen reader
 * announces "Google rating, 4.9" rather than two orphaned strings. The
 * column is `flex-col-reverse` so the value reads large on top while the
 * label stays first in the DOM, where it belongs as the term.
 */
export function TrustBar({ items, className }: TrustBarProps): ReactElement {
  const classes = className ? `${TRUST_BAR_CLASSES} ${className}` : TRUST_BAR_CLASSES

  return (
    <dl className={classes}>
      {items.map((item, index) => (
        <div key={index} className="flex flex-col-reverse gap-1 text-center">
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">{item.label}</dt>
          <dd className="text-2xl font-bold tracking-tight md:text-3xl">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
