import type { ReactElement, ReactNode } from 'react'

export interface ContainerProps {
  readonly children: ReactNode
  readonly className?: string
}

// `gutter` is a named entry on the theme's spacing scale (see theme.css),
// so Tailwind v4 generates `px-gutter` from `--spacing-gutter` the same way
// it generates `p-4` from the built-in numeric scale.
const CONTAINER_CLASSES = 'mx-auto w-full max-w-7xl px-gutter'

/**
 * Horizontal max-width + gutter wrapper. The one place page content agrees
 * on a reading width; every other layout primitive composes with it rather
 * than repeating the width/padding pair.
 */
export function Container({ children, className }: ContainerProps): ReactElement {
  const classes = className ? `${CONTAINER_CLASSES} ${className}` : CONTAINER_CLASSES

  return <div className={classes}>{children}</div>
}
