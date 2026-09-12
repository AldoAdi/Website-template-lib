import type { ReactElement } from 'react'

export interface SkipLinkProps {
  /** Fragment of the main landmark. Defaults to `'#main'`. */
  readonly href?: string
  /** Defaults to `'Skip to content'`. */
  readonly label?: string
}

// Off-screen until focused, then pinned to the top-left. `sr-only` alone
// would keep it unreachable-looking for a sighted keyboard user, who is
// exactly who this is for.
const SKIP_LINK_CLASSES =
  'sr-only focus:not-sr-only focus:bg-background focus:text-foreground focus:ring-ring focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:ring-2'

/**
 * The first focusable element on the page, jumping past the header.
 *
 * Cheap to ship and the single highest-value keyboard affordance on a site
 * with a large menu: without it, reaching the page content means tabbing
 * through every nav link on every page. The target must be the `<main>`
 * element's id, and `<main>` needs no `tabindex` -- it is focusable as a
 * fragment target in every browser that matters.
 */
export function SkipLink({
  href = '#main',
  label = 'Skip to content',
}: SkipLinkProps): ReactElement {
  return (
    <a href={href} className={SKIP_LINK_CLASSES}>
      {label}
    </a>
  )
}
