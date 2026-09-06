import type { ReactElement, ReactNode } from 'react'

export interface SectionProps {
  readonly children: ReactNode
  /** DOM id, so a page can deep-link or an `aria-labelledby` elsewhere can target this section. */
  readonly id?: string
  /** Accessible name for the region, when the section has no visible heading to label it. */
  readonly ariaLabel?: string
  /** Accessible name sourced from an existing heading id, preferred over `ariaLabel` when one exists. */
  readonly ariaLabelledBy?: string
  readonly className?: string
}

// `section` is a named entry on the theme's spacing scale (see theme.css),
// so Tailwind v4 generates `py-section` from `--spacing-section`.
const SECTION_CLASSES = 'py-section'

/**
 * Vertical rhythm wrapper for a page region. Renders a plain `<section>` —
 * it only becomes an accessible landmark once it is given a name via
 * `ariaLabel` or `ariaLabelledBy`, matching the HTML spec's own rule for
 * when `<section>` counts as a landmark.
 */
export function Section({
  children,
  id,
  ariaLabel,
  ariaLabelledBy,
  className,
}: SectionProps): ReactElement {
  const classes = className ? `${SECTION_CLASSES} ${className}` : SECTION_CLASSES

  return (
    <section id={id} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} className={classes}>
      {children}
    </section>
  )
}
