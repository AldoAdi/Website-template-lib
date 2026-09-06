/**
 * Heading tags, as one source of truth. Components take a heading level as
 * a prop rather than hardcoding a tag, so a page assembling several of them
 * can keep exactly one <h1> and skip no levels.
 */
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

/**
 * Heading tags valid for content nested inside a section. Derived from
 * `HeadingLevel` rather than written out again, so the two cannot drift.
 * Excludes `h1`: a card or other repeated item is never the page's title.
 */
export type SubHeadingLevel = Exclude<HeadingLevel, 'h1'>
