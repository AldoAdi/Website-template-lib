import type { ReactElement, ReactNode } from 'react'
import type { SubHeadingLevel } from '../headingLevel'

export interface OfferCardProps {
  /** Small label above the offer, e.g. `'New patient offer'`. */
  readonly eyebrow?: string
  /** The offer itself, written the way it is advertised: `'$75 cleaning, exam & X-ray'`. */
  readonly title: string
  readonly body?: ReactNode
  /**
   * The asterisk text: what the price excludes, who qualifies, when it
   * expires.
   *
   * Not optional by accident -- a headline price with no conditions is the
   * kind of claim that draws a regulator's attention in healthcare
   * advertising, and the small print is legally part of the offer, not a
   * design afterthought.
   */
  readonly terms: string
  /** Rendered action. Pass a tracked `BookingLink` or `CallLink` so the offer's clicks are attributable. */
  readonly actionSlot?: ReactNode
  readonly headingLevel?: SubHeadingLevel
  readonly className?: string
}

const CARD_CLASSES =
  'border-primary/30 bg-secondary text-secondary-foreground flex h-full flex-col gap-3 rounded-lg border-2 border-dashed p-6'

/**
 * A promotional offer block.
 *
 * Distinct from `Card` because the parts are not the same parts: an offer
 * has a price, a qualifier, and terms, and the terms have to render whether
 * or not the site author remembered to write them. Reusing `Card` here
 * would push the small print into free-form `body` content, where it
 * reliably gets dropped.
 *
 * The dashed border is deliberate -- it reads as a coupon rather than as
 * another content card, which is what stops the offers section from
 * blending into the services grid directly above it.
 */
export function OfferCard({
  eyebrow,
  title,
  body,
  terms,
  actionSlot,
  headingLevel = 'h3',
  className,
}: OfferCardProps): ReactElement {
  const Heading = headingLevel
  const classes = className ? `${CARD_CLASSES} ${className}` : CARD_CLASSES

  return (
    <div className={classes}>
      {eyebrow ? (
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">{eyebrow}</p>
      ) : null}
      <Heading className="text-2xl font-bold tracking-tight text-balance">{title}</Heading>
      {body ? <div className="text-muted-foreground text-sm">{body}</div> : null}
      {actionSlot ? <div className="mt-2">{actionSlot}</div> : null}
      {/* `mt-auto` pins the terms to the bottom so a row of offers with
          different body lengths still aligns its small print. */}
      <p className="text-muted-foreground mt-auto pt-2 text-xs">{terms}</p>
    </div>
  )
}
