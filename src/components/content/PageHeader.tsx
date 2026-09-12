import type { ReactElement, ReactNode } from 'react'
import { Container } from '../layout/Container'
import { Breadcrumbs } from '../nav/Breadcrumbs'
import type { Crumb } from '../nav/Breadcrumbs'

export interface PageHeaderProps {
  /** The page's only `<h1>`. */
  readonly heading: string
  readonly eyebrow?: string
  readonly lead?: ReactNode
  /** Trail including the current page. Omit on the home page, which has no trail. */
  readonly breadcrumbs?: readonly Crumb[]
  /** Rendered actions -- a tracked booking link, a phone number. */
  readonly actionSlot?: ReactNode
  readonly className?: string
}

const WRAPPER_CLASSES = 'border-border bg-secondary text-secondary-foreground border-b py-12'

/**
 * The banner at the top of an inner page: trail, title, lead, action.
 *
 * The counterpart to `Hero`, which belongs to the home page and owns a
 * full-height image and two CTAs. Inner pages need the same three things
 * every time (where am I, what is this, what do I do about it) and get
 * visually inconsistent the moment each one hand-rolls them.
 *
 * Owns the `<h1>`, so a page using it must not render another.
 */
export function PageHeader({
  heading,
  eyebrow,
  lead,
  breadcrumbs,
  actionSlot,
  className,
}: PageHeaderProps): ReactElement {
  const classes = className ? `${WRAPPER_CLASSES} ${className}` : WRAPPER_CLASSES

  return (
    <div className={classes}>
      <Container className="flex flex-col gap-4">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        {eyebrow ? (
          <p className="text-primary text-sm font-semibold tracking-widest uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{heading}</h1>
        {lead ? (
          <div className="text-muted-foreground max-w-2xl text-lg text-pretty">{lead}</div>
        ) : null}
        {actionSlot ? <div className="mt-2 flex flex-wrap gap-3">{actionSlot}</div> : null}
      </Container>
    </div>
  )
}
