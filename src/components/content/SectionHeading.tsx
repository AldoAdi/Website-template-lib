import type { ElementType, ReactElement, ReactNode } from 'react'
import type { HeadingLevel } from '../headingLevel'

export interface SectionHeadingProps {
  /** Small label above the heading -- a category, a place, a promise. */
  readonly eyebrow?: ReactNode
  readonly heading: ReactNode
  /** Heading tag. Defaults to `h2`: a section heading is never the page's one `<h1>`. */
  readonly headingLevel?: HeadingLevel
  /** Supporting sentence below the heading. */
  readonly lead?: ReactNode
  /**
   * DOM id for the heading element, so the enclosing `Section` can name
   * itself with `ariaLabelledBy` instead of duplicating the text in an
   * `ariaLabel`.
   */
  readonly id?: string
  readonly align?: 'left' | 'center'
  readonly className?: string
}

const ALIGN_CLASSES: Record<'left' | 'center', string> = {
  left: '',
  center: 'mx-auto max-w-2xl text-center',
}

/**
 * The eyebrow / heading / lead trio that opens a page section.
 *
 * Exists because a real marketing page repeats this exact structure five or
 * six times, and hand-rolling it each time is how heading levels drift, how
 * the `id` needed by `Section`'s `ariaLabelledBy` gets forgotten, and how
 * the type scale ends up slightly different in every section.
 */
export function SectionHeading({
  eyebrow,
  heading,
  headingLevel = 'h2',
  lead,
  id,
  align = 'left',
  className,
}: SectionHeadingProps): ReactElement {
  const HeadingTag: ElementType = headingLevel
  const base = `flex flex-col gap-4 ${ALIGN_CLASSES[align]}`.trim()
  const classes = className ? `${base} ${className}` : base

  return (
    <div className={classes}>
      {eyebrow ? (
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      ) : null}
      <HeadingTag id={id} className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
        {heading}
      </HeadingTag>
      {lead ? <p className="text-muted-foreground text-lg text-pretty">{lead}</p> : null}
    </div>
  )
}
