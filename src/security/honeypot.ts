/**
 * Spam heuristics for the contact form: a hidden honeypot field plus a
 * minimum dwell time between mount and submit.
 *
 * SILENT REJECTION CONTRACT — read this before wiring `isSpamSubmission` up:
 * when it returns `true`, the caller MUST still show the user their normal
 * success state and MUST NOT send the submission anywhere — no network
 * request, no error, no visible difference at all. Telling a bot (or a
 * human spammer) that it was caught teaches it how to get past the check
 * next time. Silence is the entire point of a honeypot.
 */

/** Minimum time, in milliseconds, that must pass between mount and submit. */
export const MIN_DWELL_TIME_MS = 1500

export type HoneypotCheck = Readonly<{
  /** Current value of the hidden field. A real user never fills this in. */
  readonly honeypotValue: string
  /** `Date.now()` captured when the form mounted. */
  readonly mountedAt: number
  /** `Date.now()` captured at submit time. */
  readonly submittedAt: number
}>

/**
 * Returns `true` when a submission looks like spam.
 *
 * See the module-level SILENT REJECTION CONTRACT above: a `true` result
 * must never be surfaced to the submitter as an error.
 */
export function isSpamSubmission(check: HoneypotCheck): boolean {
  if (check.honeypotValue.length > 0) {
    return true
  }

  const dwellTimeMs = check.submittedAt - check.mountedAt
  return dwellTimeMs < MIN_DWELL_TIME_MS
}
