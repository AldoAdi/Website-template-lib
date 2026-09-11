import { describe, expect, test } from 'vitest'
import { toTelHref } from '../../src/booking/tel'

describe('toTelHref', () => {
  test('strips the punctuation a human number is written with', () => {
    expect(toTelHref('(562) 438-8802')).toBe('tel:5624388802')
  })

  test('keeps a leading plus, which is the only punctuation that carries meaning', () => {
    expect(toTelHref('+1 (562) 438-8802')).toBe('tel:+15624388802')
  })

  test('ignores surrounding whitespace', () => {
    expect(toTelHref('  562.438.8802  ')).toBe('tel:5624388802')
  })

  test('does not treat a non-leading plus as international', () => {
    expect(toTelHref('562-438-8802 +ext')).toBe('tel:5624388802')
  })

  test('leaves an already-clean number alone', () => {
    expect(toTelHref('5624388802')).toBe('tel:5624388802')
  })
})
