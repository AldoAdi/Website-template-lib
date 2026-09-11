import type { ReactElement } from 'react'

export interface PlaceholderImageProps {
  /**
   * What photograph belongs here, written for whoever replaces it --
   * `'Reception area, wide'`, not `'Image'`.
   */
  readonly label: string
  /** CSS `aspect-ratio` value. Defaults to `'4 / 3'`. */
  readonly aspect?: string
  readonly className?: string
}

const PLACEHOLDER_CLASSES =
  'border-border bg-secondary text-muted-foreground flex w-full items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm'

/**
 * A sized, self-contained stand-in for a photograph that has not been shot
 * yet.
 *
 * It renders no `<img>` and loads nothing: a remote placeholder service
 * would add an origin to `img-src` in the CSP, fail in any offline or
 * air-gapped build, and still have to be removed later.
 *
 * It is `aria-hidden` on purpose. A placeholder conveys nothing to a
 * visitor who cannot see it, and the library's standing rule is that it
 * never invents alt text -- when a real photograph replaces this, the
 * `<img>` that takes its place needs alt text written by someone who has
 * seen the picture.
 *
 * The point of shipping these rather than leaving the slots empty is that
 * the layout is already correct -- and correctly sized -- on the day the
 * real photography arrives.
 */
export function PlaceholderImage({
  label,
  aspect = '4 / 3',
  className,
}: PlaceholderImageProps): ReactElement {
  const classes = className ? `${PLACEHOLDER_CLASSES} ${className}` : PLACEHOLDER_CLASSES

  return (
    <div aria-hidden="true" className={classes} style={{ aspectRatio: aspect }}>
      <span>{label}</span>
    </div>
  )
}
