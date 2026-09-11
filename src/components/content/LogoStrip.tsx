import type { ReactElement, ReactNode } from 'react'

export interface LogoStripProps {
  /**
   * One entry per logo. A string renders as a wordmark, which is the honest
   * default: a practice rarely has licensed image assets for every insurer
   * it accepts, and a set-in-type name is better than a wrong logo.
   */
  readonly items: readonly ReactNode[]
  /** Names the list for assistive technology, e.g. `'Insurance accepted'`. */
  readonly label: string
  readonly className?: string
}

const LOGO_STRIP_CLASSES = 'flex flex-wrap items-center justify-center gap-3'

const ITEM_CLASSES =
  'border-border text-muted-foreground rounded-md border px-4 py-2 text-sm font-medium'

/**
 * A row of third-party marks -- insurers, accreditations, associations.
 *
 * On a medical or dental site this is not decoration: "do you take my
 * insurance" is the question that ends most visits, and answering it on the
 * page removes a phone call that would otherwise have to happen first.
 */
export function LogoStrip({ items, label, className }: LogoStripProps): ReactElement {
  const classes = className ? `${LOGO_STRIP_CLASSES} ${className}` : LOGO_STRIP_CLASSES

  return (
    <ul aria-label={label} className={classes}>
      {items.map((item, index) => (
        <li key={index} className={ITEM_CLASSES}>
          {item}
        </li>
      ))}
    </ul>
  )
}
