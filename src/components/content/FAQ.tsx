import type { ReactElement, ReactNode } from 'react'
import type { SubHeadingLevel } from '../headingLevel'

export interface FaqItem {
  readonly question: string
  readonly answer: ReactNode
}

export interface FAQProps {
  readonly items: readonly FaqItem[]
  /** Heading level wrapping each question. Defaults to `h3`. */
  readonly headingLevel?: SubHeadingLevel
  /** Opens the first item on load. Off by default -- see the note below. */
  readonly defaultOpenFirst?: boolean
  readonly className?: string
}

const FAQ_CLASSES = 'divide-border border-border divide-y border-y'

// `list-none` plus the WebKit pseudo-element both have to go: Chrome and
// Safari draw the disclosure triangle through different mechanisms, and
// removing only one leaves a stray marker in the other.
const SUMMARY_CLASSES =
  'flex w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold [&::-webkit-details-marker]:hidden'

/**
 * Frequently asked questions, built on native `<details>` / `<summary>`.
 *
 * No JavaScript and no state: the browser owns the open/closed behaviour,
 * which means it works before hydration, under `output: 'export'`, with
 * JavaScript disabled, and with correct keyboard and screen-reader
 * semantics that a hand-rolled accordion has to re-earn from scratch.
 *
 * `defaultOpenFirst` is off by default because an open first item pushes
 * every other question below the fold, and the value of an FAQ block is
 * that a visitor can scan all the questions at once.
 *
 * Pair with `buildFaqPageSchema` from the `./seo` subpath to emit the
 * matching structured data. Keep both reading from one array of plain
 * strings: search engines require the answer text, and a `ReactNode` answer
 * cannot be serialized into JSON-LD.
 */
export function FAQ({
  items,
  headingLevel = 'h3',
  defaultOpenFirst = false,
  className,
}: FAQProps): ReactElement {
  const Heading = headingLevel
  const classes = className ? `${FAQ_CLASSES} ${className}` : FAQ_CLASSES

  return (
    <div className={classes}>
      {items.map((item, index) => (
        <details key={item.question} open={defaultOpenFirst && index === 0} className="group">
          <summary className={SUMMARY_CLASSES}>
            <Heading className="text-base font-semibold">{item.question}</Heading>
            <span
              aria-hidden="true"
              className="text-primary shrink-0 text-xl transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="text-muted-foreground pb-5 text-sm text-pretty">{item.answer}</div>
        </details>
      ))}
    </div>
  )
}
