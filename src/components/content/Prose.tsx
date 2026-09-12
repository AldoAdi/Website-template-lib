import type { ReactElement, ReactNode } from 'react'

export interface ProseProps {
  readonly children: ReactNode
  readonly className?: string
}

// Descendant selectors rather than a typography plugin: the library has no
// build step and no plugin dependency, and this is the whole of what a
// service page's body copy needs. Every value is a theme token, so prose
// follows the palette like everything else.
const PROSE_CLASSES = [
  'max-w-2xl text-pretty',
  '[&_p]:text-muted-foreground [&_p]:mb-4 [&_p]:leading-relaxed',
  '[&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight',
  '[&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_ul]:text-muted-foreground [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6',
  '[&_ol]:text-muted-foreground [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_li]:mb-1',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
  '[&_strong]:text-foreground [&_strong]:font-semibold',
  '[&_blockquote]:border-primary [&_blockquote]:text-muted-foreground [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic',
  '[&_>:first-child]:mt-0 [&_>:last-child]:mb-0',
].join(' ')

/**
 * Typographic defaults for long-form body copy on a content page.
 *
 * Exists so a service or education page can be written as ordinary JSX
 * paragraphs and headings without every one of them carrying its own
 * classes -- which is how two pages in the same site end up with different
 * line heights.
 *
 * It styles descendants and sets no heading levels itself: the page decides
 * whether its sections are `h2` or `h3`, because only the page knows what
 * sits above them.
 */
export function Prose({ children, className }: ProseProps): ReactElement {
  return (
    <div className={className ? `${PROSE_CLASSES} ${className}` : PROSE_CLASSES}>{children}</div>
  )
}
