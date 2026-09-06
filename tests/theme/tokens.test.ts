import { describe, expect, test } from 'vitest'
import {
  COLOR_TOKENS,
  RADIUS_TOKENS,
  FONT_TOKENS,
  SPACING_TOKENS,
  colorVar,
  radiusVar,
  fontVar,
  spacingVar,
} from '../../src/theme/tokens'

describe('theme tokens', () => {
  test('colorVar builds the matching CSS custom property reference', () => {
    expect(colorVar('primary')).toBe('var(--color-primary)')
    expect(colorVar('primary-foreground')).toBe('var(--color-primary-foreground)')
  })

  test('radiusVar builds the matching CSS custom property reference', () => {
    expect(radiusVar('lg')).toBe('var(--radius-lg)')
  })

  test('fontVar builds the matching CSS custom property reference', () => {
    expect(fontVar('mono')).toBe('var(--font-mono)')
  })

  test('spacingVar builds the matching CSS custom property reference', () => {
    expect(spacingVar('section')).toBe('var(--spacing-section)')
  })

  test('every token list is non-empty and has no duplicates', () => {
    for (const tokens of [COLOR_TOKENS, RADIUS_TOKENS, FONT_TOKENS, SPACING_TOKENS]) {
      expect(tokens.length).toBeGreaterThan(0)
      expect(new Set(tokens).size).toBe(tokens.length)
    }
  })
})
