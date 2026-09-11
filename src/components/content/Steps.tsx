import type { ReactElement, ReactNode } from 'react'
import type { SubHeadingLevel } from '../headingLevel'

export interface StepItem {
  readonly title: string
  readonly body: ReactNode
}

export interface StepsProps {
  readonly items: readonly StepItem[]
  /** Heading level for each step title. Defaults to `h3`. */
  readonly headingLevel?: SubHeadingLevel
  readonly className?: string
}

const STEPS_CLASSES = 'grid gap-8 sm:grid-cols-3'

// The visible number comes from a rendered span rather than a CSS counter or
// a list marker, because it is a real part of the content here -- "step 2 of
// 3" is the information, not decoration. `<ol>` still carries the ordering
// semantics for assistive technology.
const MARKER_CLASSES =
  'bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold'

/**
 * A numbered process -- "what happens at your first visit" and its cousins.
 *
 * Answers the question that stops a nervous visitor from booking, which is
 * not "what do you offer" but "what is going to happen to me".
 */
export function Steps({ items, headingLevel = 'h3', className }: StepsProps): ReactElement {
  const Heading = headingLevel
  const classes = className ? `${STEPS_CLASSES} ${className}` : STEPS_CLASSES

  return (
    <ol className={classes}>
      {items.map((item, index) => (
        <li key={item.title} className="flex flex-col gap-3">
          <span className={MARKER_CLASSES} aria-hidden="true">
            {index + 1}
          </span>
          <Heading className="text-lg font-semibold">{item.title}</Heading>
          <p className="text-muted-foreground text-sm text-pretty">{item.body}</p>
        </li>
      ))}
    </ol>
  )
}
