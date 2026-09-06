// TS mirror of the custom properties defined in theme.css. Keep these two
// files in lockstep by hand -- there is no build step to generate one from
// the other. Used to type color/radius/font/spacing props on components
// without ever letting a component hardcode a literal value.

export const COLOR_TOKENS = [
  'background',
  'foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'border',
  'ring',
  'destructive',
  'destructive-foreground',
] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]

export const RADIUS_TOKENS = ['sm', 'md', 'lg', 'xl'] as const

export type RadiusToken = (typeof RADIUS_TOKENS)[number]

export const FONT_TOKENS = ['sans', 'mono'] as const

export type FontToken = (typeof FONT_TOKENS)[number]

export const SPACING_TOKENS = ['gutter', 'section', 'header'] as const

export type SpacingToken = (typeof SPACING_TOKENS)[number]

/** `colorVar('primary')` -> `'var(--color-primary)'` */
export function colorVar(token: ColorToken): string {
  return `var(--color-${token})`
}

/** `radiusVar('md')` -> `'var(--radius-md)'` */
export function radiusVar(token: RadiusToken): string {
  return `var(--radius-${token})`
}

/** `fontVar('sans')` -> `'var(--font-sans)'` */
export function fontVar(token: FontToken): string {
  return `var(--font-${token})`
}

/** `spacingVar('section')` -> `'var(--spacing-section)'` */
export function spacingVar(token: SpacingToken): string {
  return `var(--spacing-${token})`
}
