import { z } from 'zod'

/**
 * Boundary validation and sanitization for the contact form.
 *
 * Per SPEC.md ("Always: validate and sanitize all form input at the
 * boundary with zod"), this is that boundary. It never throws for
 * ordinary bad input — {@link validateContactSubmission} always returns a
 * discriminated {@link ValidationResult} so a caller can render
 * field-level errors instead of catching an exception.
 */

export const NAME_MIN_LENGTH = 1
export const NAME_MAX_LENGTH = 100
export const EMAIL_MAX_LENGTH = 254
export const MESSAGE_MIN_LENGTH = 1
export const MESSAGE_MAX_LENGTH = 5000

/**
 * Characters stripped by {@link sanitizeText}:
 * - C0 controls (U+0000–U+001F) except tab/newline/CR, which are left in
 *   place so a multi-line message keeps its paragraph breaks.
 * - DEL (U+007F) and the C1 control block (U+0080–U+009F).
 * - Zero-width characters (U+200B–U+200D zero-width space/non-joiner/
 *   joiner, U+FEFF byte-order-mark-as-zero-width-no-break-space) —
 *   invisible, and commonly used to smuggle content past naive filters
 *   or to fake blank-looking input.
 *
 * Deliberately NOT stripped: combining marks, non-Latin scripts, emoji.
 * A name like "José" (precomposed or built from a base letter plus a
 * combining accent), "李", or one containing an emoji is legitimate
 * international input, not an attack — see tests/security/validate.test.ts.
 */
const STRIPPED_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g

/** Strips control/zero-width characters (see above) and trims whitespace. */
export function sanitizeText(value: string): string {
  return value.replace(STRIPPED_CHARS_PATTERN, '').trim()
}

const contactSubmissionSchema = z.object({
  name: z
    .string()
    .min(NAME_MIN_LENGTH, 'Name is required')
    .max(NAME_MAX_LENGTH, `Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  email: z
    .email('Enter a valid email address')
    .max(EMAIL_MAX_LENGTH, `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`),
  message: z
    .string()
    .min(MESSAGE_MIN_LENGTH, 'Message is required')
    .max(MESSAGE_MAX_LENGTH, `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`),
})

export type ContactSubmission = Readonly<z.output<typeof contactSubmissionSchema>>

export type RawContactSubmission = Readonly<{
  readonly name: string
  readonly email: string
  readonly message: string
}>

export type FieldErrors = Readonly<Partial<Record<keyof ContactSubmission, readonly string[]>>>

export type ValidationResult =
  | Readonly<{ readonly success: true; readonly data: ContactSubmission }>
  | Readonly<{ readonly success: false; readonly errors: FieldErrors }>

/**
 * Sanitizes and validates a raw contact-form submission.
 *
 * Never throws for ordinary invalid input (empty fields, bad email shape,
 * oversize input) — it returns `{ success: false, errors }` instead, so a
 * form component can render per-field messages without a try/catch.
 */
export function validateContactSubmission(input: RawContactSubmission): ValidationResult {
  const sanitized = {
    name: sanitizeText(input.name),
    email: sanitizeText(input.email),
    message: sanitizeText(input.message),
  }

  const result = contactSubmissionSchema.safeParse(sanitized)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: z.flattenError(result.error).fieldErrors }
}
