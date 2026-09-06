import { describe, expect, test } from 'vitest'
import {
  EMAIL_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  sanitizeText,
  validateContactSubmission,
  type RawContactSubmission,
} from '../../src/security/validate'

// Unicode escapes are used throughout instead of literal invisible/control
// characters so the intent of every test case is visible in the source.
const NUL = '\u0000'
const SOH = '\u0001'
const ZERO_WIDTH_SPACE = '\u200b'
const BOM = '\ufeff'
const COMBINING_ACUTE = '\u0301'
const PARTY_EMOJI = '\u{1f389}'

const VALID: RawContactSubmission = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Hello, I would like to know more about your services.',
}

function withField(field: keyof RawContactSubmission, value: string): RawContactSubmission {
  return { ...VALID, [field]: value }
}

describe('validateContactSubmission — valid submissions', () => {
  const validCases: ReadonlyArray<{ readonly label: string; readonly input: RawContactSubmission }> = [
    { label: 'plain ASCII name/email/message', input: VALID },
    { label: 'precomposed accented name (Jos\u00e9)', input: withField('name', 'Jos\u00e9') },
    {
      label: 'combining-mark accented name (Jose + combining acute)',
      input: withField('name', `Jose${COMBINING_ACUTE}`),
    },
    { label: 'non-Latin script name (CJK)', input: withField('name', '\u674e') },
    { label: 'name containing an emoji', input: withField('name', `Ada ${PARTY_EMOJI}`) },
    { label: 'subaddressed email (plus tag)', input: withField('email', 'ada+newsletter@example.com') },
    { label: 'email with subdomain', input: withField('email', 'ada@mail.example.co.uk') },
  ]

  test.each(validCases)('$label passes', ({ input }) => {
    const result = validateContactSubmission(input)

    expect(result.success).toBe(true)
  })
})

describe('validateContactSubmission — empty and whitespace-only fields rejected', () => {
  const emptyCases: ReadonlyArray<{
    readonly label: string
    readonly field: keyof RawContactSubmission
    readonly value: string
  }> = [
    { label: 'empty name', field: 'name', value: '' },
    { label: 'whitespace-only name', field: 'name', value: '   ' },
    { label: 'empty email', field: 'email', value: '' },
    { label: 'whitespace-only email', field: 'email', value: '   ' },
    { label: 'empty message', field: 'message', value: '' },
    { label: 'whitespace-only message', field: 'message', value: '   ' },
  ]

  test.each(emptyCases)('$label is rejected', ({ field, value }) => {
    const result = validateContactSubmission(withField(field, value))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[field]).toBeDefined()
      expect(result.errors[field]?.length).toBeGreaterThan(0)
    }
  })
})

describe('validateContactSubmission — oversize input rejected', () => {
  const oversizeCases: ReadonlyArray<{
    readonly label: string
    readonly field: keyof RawContactSubmission
    readonly value: string
  }> = [
    {
      label: 'name beyond the max length',
      field: 'name',
      value: 'a'.repeat(NAME_MAX_LENGTH + 1),
    },
    {
      label: 'email beyond the max length',
      field: 'email',
      // long-but-otherwise-valid-shaped email, still over the length cap
      value: `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`,
    },
    {
      label: 'message beyond the max length',
      field: 'message',
      value: 'a'.repeat(MESSAGE_MAX_LENGTH + 1),
    },
  ]

  test.each(oversizeCases)('$label is rejected', ({ field, value }) => {
    const result = validateContactSubmission(withField(field, value))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[field]).toBeDefined()
    }
  })
})

describe('validateContactSubmission — malformed emails rejected', () => {
  const malformedEmails: readonly string[] = [
    'plainaddress',
    'missing-at-sign.com',
    '@missingusername.com',
    'user@',
    'user@domain,com',
    'user@@example.com',
    'user@ example.com',
    'user@domain..com',
    'user name@example.com',
  ]

  test.each(malformedEmails)('%s is rejected', (email) => {
    const result = validateContactSubmission(withField('email', email))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.email).toBeDefined()
    }
  })
})

describe('sanitizeText', () => {
  test('strips control characters', () => {
    const input = `A${NUL}B${SOH}C`

    expect(sanitizeText(input)).toBe('ABC')
  })

  test('strips a zero-width character', () => {
    const input = `Hello${ZERO_WIDTH_SPACE}World`

    expect(sanitizeText(input)).toBe('HelloWorld')
  })

  test('strips mixed control and zero-width characters together', () => {
    const input = `${NUL}Hi${ZERO_WIDTH_SPACE}There${BOM}`

    expect(sanitizeText(input)).toBe('HiThere')
  })

  test('trims leading and trailing whitespace', () => {
    expect(sanitizeText('   hello world   ')).toBe('hello world')
  })

  test('does not strip combining marks, non-Latin scripts, or emoji', () => {
    expect(sanitizeText('Jos\u00e9')).toBe('Jos\u00e9')
    expect(sanitizeText(`Jose${COMBINING_ACUTE}`)).toBe(`Jose${COMBINING_ACUTE}`)
    expect(sanitizeText('\u674e')).toBe('\u674e')
    expect(sanitizeText(`Ada ${PARTY_EMOJI}`)).toBe(`Ada ${PARTY_EMOJI}`)
  })
})

describe('validateContactSubmission — sanitizes before validating', () => {
  test('trims and strips control characters from the returned data', () => {
    const result = validateContactSubmission({
      name: '  Ada Lovelace  ',
      email: 'ada@example.com',
      message: `  Hello${ZERO_WIDTH_SPACE} there  `,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Ada Lovelace')
      expect(result.data.message).toBe('Hello there')
    }
  })
})
