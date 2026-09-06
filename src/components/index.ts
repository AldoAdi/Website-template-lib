export * from './layout'
export * from './content'
// Heading levels are shared by every component that takes one as a prop,
// so they live beside the components rather than inside any one of them.
export type { HeadingLevel, SubHeadingLevel } from './headingLevel'
