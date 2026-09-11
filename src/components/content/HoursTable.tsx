import type { ReactElement } from 'react'

export interface HoursRow {
  /** Day or day range as it should read, e.g. `'Mon – Wed'`. */
  readonly days: string
  /** Opening times as they should read, e.g. `'8:00am – 5:00pm'` or `'Closed'`. */
  readonly hours: string
  /** Renders the row muted. Explicit rather than inferred from the text, so it works in any language. */
  readonly closed?: boolean
}

export interface HoursTableProps {
  readonly rows: readonly HoursRow[]
  /** Visible table caption. Defaults to `'Opening hours'`. */
  readonly caption?: string
  readonly className?: string
}

const TABLE_CLASSES = 'w-full text-sm'

/**
 * Opening hours as a real `<table>` with a `<caption>` and row headers.
 *
 * A definition list or a stack of divs would look identical and lose the
 * row/column relationship, which is the only thing that makes the block
 * navigable in a screen reader.
 *
 * Deliberately static: no "open now" badge. That needs the practice's
 * timezone and the visitor's clock, and a wrong badge ("Open now" on a
 * Sunday) costs more trust than the feature earns. `buildLocalBusinessSchema`
 * in the `./seo` subpath is where these hours become machine-readable, and
 * that is what puts them in a search result.
 */
export function HoursTable({
  rows,
  caption = 'Opening hours',
  className,
}: HoursTableProps): ReactElement {
  const classes = className ? `${TABLE_CLASSES} ${className}` : TABLE_CLASSES

  return (
    <table className={classes}>
      <caption className="mb-3 text-left font-semibold">{caption}</caption>
      <tbody className="divide-border divide-y">
        {rows.map((row) => (
          <tr key={row.days} className={row.closed ? 'text-muted-foreground' : undefined}>
            <th scope="row" className="py-2 pr-4 text-left font-normal">
              {row.days}
            </th>
            <td className="py-2 text-right font-medium">{row.hours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
