import type { ReactElement, ReactNode } from 'react'

export interface FeatureGridProps {
  /** Typically a list of `Card` elements, but any content is accepted. */
  readonly children: ReactNode
  readonly className?: string
}

// Responsive column count via CSS grid utilities only: 1 column by default,
// 2 from `sm`, 3 from `lg`. No JS measuring, no resize listener -- the
// breakpoints are pure CSS media queries baked into the Tailwind utilities.
const FEATURE_GRID_CLASSES = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'

/**
 * Responsive grid for feature content (typically `Card` children): 1 column
 * by default, 2 from `sm`, 3 from `lg`. Pure CSS grid -- no JS layout.
 */
export function FeatureGrid({ children, className }: FeatureGridProps): ReactElement {
  const classes = className ? `${FEATURE_GRID_CLASSES} ${className}` : FEATURE_GRID_CLASSES

  return <div className={classes}>{children}</div>
}
