import type { ReactElement, ReactNode } from 'react'
import { Container } from '../layout/Container'
import { Section } from '../layout/Section'

export interface SplitSectionProps {
  /** Image, video, or `PlaceholderImage`. Given no layout classes of its own -- the grid sizes it. */
  readonly media: ReactNode
  /** Heading, copy, CTA: usually a `SectionHeading` plus prose. */
  readonly children: ReactNode
  /**
   * Which side the media sits on from `md` up. Defaults to `'start'`.
   *
   * Alternating this down a page is what keeps a run of split sections from
   * reading as one long column of near-identical blocks.
   */
  readonly mediaSide?: 'start' | 'end'
  readonly id?: string
  readonly ariaLabelledBy?: string
  readonly ariaLabel?: string
  readonly className?: string
}

const GRID_CLASSES = 'grid items-center gap-10 md:grid-cols-2'

/**
 * Media on one side, words on the other.
 *
 * The single most repeated layout on a marketing page -- doctor bio,
 * technology, tour the office -- and the one most often rebuilt by hand in
 * each site, which is how three of them end up with three different
 * gutters. One component, one gutter.
 *
 * Source order always puts the media first and the text second, with
 * `mediaSide: 'end'` flipping it visually via `md:order-2`. Reading order
 * therefore stays constant no matter how the page alternates: a screen
 * reader and a keyboard always meet the image's caption before the prose
 * about it, rather than having the sequence reverse on every other section.
 */
export function SplitSection({
  media,
  children,
  mediaSide = 'start',
  id,
  ariaLabelledBy,
  ariaLabel,
  className,
}: SplitSectionProps): ReactElement {
  const mediaOrder = mediaSide === 'end' ? 'md:order-2' : ''

  return (
    <Section id={id} ariaLabel={ariaLabel} ariaLabelledBy={ariaLabelledBy} className={className}>
      <Container className={GRID_CLASSES}>
        <div className={mediaOrder}>{media}</div>
        <div className="flex flex-col gap-6">{children}</div>
      </Container>
    </Section>
  )
}
