import type { ReactElement, ReactNode } from 'react'

export interface TestimonialProps {
  readonly quote: ReactNode
  /** Who said it. A first name and initial is the norm for a medical practice. */
  readonly author: string
  /** Optional qualifier under the name, e.g. `'Patient since 2019'`. */
  readonly detail?: string
  /** Whole stars out of five. Omit rather than guess -- see the note below. */
  readonly rating?: number
  readonly className?: string
}

const TESTIMONIAL_CLASSES =
  'flex h-full flex-col gap-4 rounded-lg border border-border bg-background p-6'

const MAX_RATING = 5

/**
 * A single patient quote.
 *
 * The stars are `aria-hidden` glyphs behind one `<p>` carrying the rating in
 * words, so the rating is announced once as "Rated 5 out of 5" rather than
 * as five separate star characters.
 *
 * Note on `rating`: this renders a *visible* claim only. It deliberately
 * emits no `Review` or `AggregateRating` structured data -- a machine
 * readable rating that is not backed by real collected reviews is a search
 * engine policy violation, and the library will not make that claim on a
 * site's behalf from a marketing prop.
 */
export function Testimonial({
  quote,
  author,
  detail,
  rating,
  className,
}: TestimonialProps): ReactElement {
  const classes = className ? `${TESTIMONIAL_CLASSES} ${className}` : TESTIMONIAL_CLASSES
  const wholeStars =
    rating === undefined ? 0 : Math.max(0, Math.min(MAX_RATING, Math.round(rating)))

  return (
    <figure className={classes}>
      {rating !== undefined ? (
        <p className="text-primary text-sm tracking-widest">
          <span aria-hidden="true">
            {'★'.repeat(wholeStars)}
            {'☆'.repeat(MAX_RATING - wholeStars)}
          </span>
          <span className="sr-only">{`Rated ${wholeStars} out of ${MAX_RATING}`}</span>
        </p>
      ) : null}
      <blockquote className="text-pretty">{quote}</blockquote>
      <figcaption className="text-muted-foreground mt-auto text-sm">
        <span className="text-foreground font-semibold">{author}</span>
        {detail ? <span className="block">{detail}</span> : null}
      </figcaption>
    </figure>
  )
}
