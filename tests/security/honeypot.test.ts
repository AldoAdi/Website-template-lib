import { describe, expect, test } from 'vitest'
import {
  MIN_DWELL_TIME_MS,
  isSpamSubmission,
  type HoneypotCheck,
} from '../../src/security/honeypot'

const MOUNTED_AT = 1_000_000

function checkAt(overrides: Partial<HoneypotCheck> = {}): HoneypotCheck {
  return {
    honeypotValue: '',
    mountedAt: MOUNTED_AT,
    submittedAt: MOUNTED_AT + MIN_DWELL_TIME_MS + 1,
    ...overrides,
  }
}

describe('isSpamSubmission', () => {
  const cases: ReadonlyArray<{
    readonly label: string
    readonly input: HoneypotCheck
    readonly expected: boolean
  }> = [
    {
      label: 'empty honeypot + sufficient dwell time is accepted',
      input: checkAt({ submittedAt: MOUNTED_AT + MIN_DWELL_TIME_MS + 500 }),
      expected: false,
    },
    {
      label: 'filled honeypot is rejected regardless of dwell time',
      input: checkAt({
        honeypotValue: 'i-am-a-bot',
        submittedAt: MOUNTED_AT + MIN_DWELL_TIME_MS + 500,
      }),
      expected: true,
    },
    {
      label: 'dwell time below the minimum is rejected',
      input: checkAt({ submittedAt: MOUNTED_AT + MIN_DWELL_TIME_MS - 1 }),
      expected: true,
    },
    {
      label: 'dwell time far below the minimum (instant submit) is rejected',
      input: checkAt({ submittedAt: MOUNTED_AT }),
      expected: true,
    },
    {
      label: 'exactly at the minimum dwell time is accepted (boundary)',
      input: checkAt({ submittedAt: MOUNTED_AT + MIN_DWELL_TIME_MS }),
      expected: false,
    },
    {
      label: 'filled honeypot with whitespace-only value is still rejected',
      input: checkAt({ honeypotValue: ' ', submittedAt: MOUNTED_AT + MIN_DWELL_TIME_MS + 500 }),
      expected: true,
    },
  ]

  test.each(cases)('$label', ({ input, expected }) => {
    expect(isSpamSubmission(input)).toBe(expected)
  })
})
