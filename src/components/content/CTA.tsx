import type { ElementType, ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import type { HeadingLevel } from '../headingLevel'
import { Container } from '../layout/Container'
import { Section } from '../layout/Section'

export interface CTAAction {
  readonly label: string
  readonly href: string
}

export interface CTAProps {
  readonly heading: ReactNode
  /** Heading tag rendered for `heading`. Defaults to `h2` -- CTA is never the source of the page's one `<h1>`. */
  readonly headingLevel?: HeadingLevel
  readonly body: ReactNode
  /** Ignored when `actionSlot` is given. */
  readonly action?: CTAAction
  /**
   * Replaces the rendered action with a caller-supplied element.
   *
   * Same reason `Hero` has `primaryActionSlot`: `action` renders a bare
   * `<Link>` that records nothing, and a CTA band is usually the page's
   * second-best converting spot -- worth measuring separately from the
   * hero, which needs a tracked anchor here rather than a plain one.
   */
  readonly actionSlot?: ReactNode
  readonly className?: string
}

const CTA_CLASSES = 'bg-primary text-primary-foreground'

/** Exported so a caller filling `actionSlot` can match the button it replaces. */
export const CTA_ACTION_CLASSES =
  'bg-background text-foreground hover:bg-background/90 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors'

/**
 * Full-bleed call-to-action band: a heading, supporting body copy, and a
 * single action. `Section` supplies the full-width band and vertical
 * rhythm; `Container` inside it constrains the copy to the reading width,
 * the same split `Footer` and `Header` use for their own bands.
 *
 * `headingLevel` renders the actual tag for `heading` -- default `h2`, since
 * a CTA band is always a secondary section on the page, never the source of
 * its one `<h1>`.
 */
export function CTA({
  heading,
  headingLevel = 'h2',
  body,
  action,
  actionSlot,
  className,
}: CTAProps): ReactElement {
  const HeadingTag: ElementType = headingLevel
  const classes = className ? `${CTA_CLASSES} ${className}` : CTA_CLASSES

  return (
    <Section className={classes}>
      <Container className="flex flex-col items-center gap-6 text-center">
        <HeadingTag className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {heading}
        </HeadingTag>
        <p className="max-w-2xl text-lg text-balance opacity-90">{body}</p>
        {actionSlot ??
          (action ? (
            <Link href={action.href} className={CTA_ACTION_CLASSES}>
              {action.label}
            </Link>
          ) : null)}
      </Container>
    </Section>
  )
}
