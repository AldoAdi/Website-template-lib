import type { ElementType, ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import { Container } from '../layout/Container'
import { Section } from '../layout/Section'

/** Any HTML heading tag. Kept as a plain union rather than a shared export so `Hero` and `CTA` stay independent of each other. */
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface HeroAction {
  readonly label: string
  readonly href: string
}

export interface HeroProps {
  /** Small label above the headline, e.g. a category or product name. */
  readonly eyebrow?: ReactNode
  readonly headline: ReactNode
  /** Heading tag rendered for `headline`. Defaults to `h1` -- override on any page where the Hero is not the source of the page's one `<h1>`. */
  readonly headingLevel?: HeadingLevel
  readonly subhead?: ReactNode
  readonly primaryAction: HeroAction
  readonly secondaryAction?: HeroAction
  /** Image slot -- the consumer supplies the `<img>` (or `next/image`) element, alt text included. The library never invents alt text. */
  readonly image?: ReactNode
  readonly className?: string
}

const PRIMARY_ACTION_CLASSES =
  'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors'

const SECONDARY_ACTION_CLASSES =
  'border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium transition-colors'

/**
 * Above-the-fold introduction: optional eyebrow, headline, optional subhead,
 * a primary action plus an optional secondary action, and an optional image
 * slot. Composes `Section` (vertical rhythm) and `Container` (reading
 * width) rather than repeating that layout.
 *
 * `headingLevel` renders the actual tag for `headline` -- default `h1`,
 * since Hero is usually the top of the page, but a page assembling several
 * heading-bearing sections should override it so only one `<h1>` exists.
 */
export function Hero({
  eyebrow,
  headline,
  headingLevel = 'h1',
  subhead,
  primaryAction,
  secondaryAction,
  image,
  className,
}: HeroProps): ReactElement {
  const HeadlineTag: ElementType = headingLevel

  return (
    <Section className={className}>
      <Container className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-6">
          {eyebrow ? (
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              {eyebrow}
            </p>
          ) : null}
          <HeadlineTag className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
            {headline}
          </HeadlineTag>
          {subhead ? (
            <p className="text-muted-foreground text-lg text-balance">{subhead}</p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <Link href={primaryAction.href} className={PRIMARY_ACTION_CLASSES}>
              {primaryAction.label}
            </Link>
            {secondaryAction ? (
              <Link href={secondaryAction.href} className={SECONDARY_ACTION_CLASSES}>
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>
        {image ? <div className="flex items-center justify-center">{image}</div> : null}
      </Container>
    </Section>
  )
}
