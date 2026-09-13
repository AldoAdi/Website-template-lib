import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

// Regression guard for the --color-muted-foreground contrast fix: the token
// is used as small text (OfferCard body/terms, PlaceholderImage label) on
// both --color-background (#ffffff) and --color-secondary/--color-muted
// (#f4f4f5), so it must clear WCAG AA 4.5:1 on both.
const THEME_CSS_PATH = join(__dirname, '../../src/theme/theme.css')

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const channel = (v: number): number => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA)
  const luminanceB = relativeLuminance(hexB)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

function extractToken(css: string, selector: string, property: string): string {
  const block = css.slice(css.indexOf(`${selector} {`))
  const match = new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})`).exec(block)
  const captured = match?.[1]
  if (!captured) throw new Error(`${property} not found in ${selector}`)
  return captured
}

const WCAG_AA_SMALL_TEXT = 4.5

describe('theme.css contrast', () => {
  const css = readFileSync(THEME_CSS_PATH, 'utf-8')

  test('light --color-muted-foreground passes AA on both backgrounds it is used on', () => {
    const mutedForeground = extractToken(css, '@theme', '--color-muted-foreground')

    expect(contrastRatio(mutedForeground, '#ffffff')).toBeGreaterThanOrEqual(WCAG_AA_SMALL_TEXT)
    expect(contrastRatio(mutedForeground, '#f4f4f5')).toBeGreaterThanOrEqual(WCAG_AA_SMALL_TEXT)
  })

  test('dark --color-muted-foreground still passes AA on both backgrounds it is used on', () => {
    const mutedForeground = extractToken(css, '.dark', '--color-muted-foreground')

    expect(contrastRatio(mutedForeground, '#27272a')).toBeGreaterThanOrEqual(WCAG_AA_SMALL_TEXT)
    expect(contrastRatio(mutedForeground, '#0a0a0a')).toBeGreaterThanOrEqual(WCAG_AA_SMALL_TEXT)
  })
})

describe('theme.css focus-visible baseline', () => {
  const css = readFileSync(THEME_CSS_PATH, 'utf-8')

  test('defines a base :focus-visible outline using --color-ring', () => {
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-ring\)/)
  })
})
