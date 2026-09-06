'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Field } from './Field'
import { useFormPost } from './useFormPost'
import { validateContactSubmission } from '../../security/validate'
import type { FieldErrors, RawContactSubmission } from '../../security/validate'
import { isSpamSubmission } from '../../security/honeypot'

export interface ContactFormProps {
  /**
   * Web3Forms (or a swapped-in provider's) public access key. Public by
   * design -- see SPEC.md -- it identifies the destination inbox, not a
   * secret, so it is fine to pass a `NEXT_PUBLIC_*` env value here.
   */
  readonly accessKey: string
  /** POST target. Defaults to Web3Forms; swapping providers is just this prop. */
  readonly endpoint?: string
  /** Optional subject line forwarded in the payload. */
  readonly subject?: string
  readonly submitLabel?: string
  readonly successMessage?: string
  readonly errorFallbackMessage?: string
  readonly className?: string
}

const DEFAULT_ENDPOINT = 'https://api.web3forms.com/submit'
const DEFAULT_SUBMIT_LABEL = 'Send message'
const DEFAULT_SUCCESS_MESSAGE = 'Thanks! Your message has been sent.'
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const HONEYPOT_FIELD_NAME = 'company'

const EMPTY_SUBMISSION: RawContactSubmission = { name: '', email: '', message: '' }

const FORM_CLASSES = 'flex flex-col gap-gutter'
const SUBMIT_BUTTON_CLASSES =
  'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
// Off-screen, out of tab order, and hidden from assistive tech -- a real
// visitor never sees or reaches this field, only an automated filler would.
const HONEYPOT_WRAPPER_CLASSES = 'absolute left-[-9999px] top-auto h-px w-px overflow-hidden'

/**
 * Name / email / message contact form, posted client-side via a plain
 * `fetch` -- no route handler, so this works under `output: 'export'`.
 *
 * Validation runs through `src/security/validate.ts` on blur and on
 * submit; spam filtering runs through `src/security/honeypot.ts`. Per that
 * module's SILENT REJECTION CONTRACT, a spam-flagged submission shows the
 * same success state as a real one and sends nothing -- see `handleSubmit`.
 */
export function ContactForm({
  accessKey,
  endpoint = DEFAULT_ENDPOINT,
  subject,
  submitLabel = DEFAULT_SUBMIT_LABEL,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  errorFallbackMessage = DEFAULT_ERROR_MESSAGE,
  className,
}: ContactFormProps): ReactElement {
  const [values, setValues] = useState<RawContactSubmission>(EMPTY_SUBMISSION)
  const [honeypotValue, setHoneypotValue] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [silentSuccess, setSilentSuccess] = useState(false)
  // Generated, not hardcoded: two ContactForms on one page would otherwise
  // emit duplicate ids and the second label would point at the first input.
  const honeypotId = useId()
  // Captured in an effect, not during render: `Date.now()` is impure, and
  // the honeypot's dwell check needs the real mount time regardless, which
  // an effect (running once, after the first commit) gives us without
  // calling an impure function from the render body.
  const mountedAtRef = useRef<number | null>(null)
  useEffect(() => {
    mountedAtRef.current = Date.now()
  }, [])
  const { status: postStatus, errorMessage: postErrorMessage, submit } = useFormPost(endpoint)

  const status = silentSuccess ? 'success' : postStatus
  const isSubmitting = status === 'submitting'

  function updateField(field: keyof RawContactSubmission, value: string): void {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  function revalidate(current: RawContactSubmission): void {
    const result = validateContactSubmission(current)
    setFieldErrors(result.success ? {} : result.errors)
  }

  function handleBlur(): void {
    revalidate(values)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const result = validateContactSubmission(values)
    if (!result.success) {
      setFieldErrors(result.errors)
      return
    }
    setFieldErrors({})

    // mountedAtRef.current is only null if submit somehow fires before the
    // mount effect has run, which React guarantees not to happen for a
    // user-initiated submit; the fallback just keeps the type honest.
    const isSpam = isSpamSubmission({
      honeypotValue,
      mountedAt: mountedAtRef.current ?? Date.now(),
      submittedAt: Date.now(),
    })

    if (isSpam) {
      // SILENT REJECTION CONTRACT (src/security/honeypot.ts): report the
      // same success state a real visitor would see, and send nothing.
      setSilentSuccess(true)
      return
    }

    await submit({
      access_key: accessKey,
      subject,
      name: result.data.name,
      email: result.data.email,
      message: result.data.message,
    })
  }

  const liveMessage = describeStatus(
    status,
    successMessage,
    postErrorMessage ?? errorFallbackMessage,
  )
  const formClasses = className ? `${FORM_CLASSES} ${className}` : FORM_CLASSES

  return (
    <form className={formClasses} onSubmit={handleSubmit} noValidate>
      <Field
        label="Name"
        name="name"
        value={values.name}
        onChange={(value) => updateField('name', value)}
        onBlur={handleBlur}
        error={fieldErrors.name?.[0]}
        autoComplete="name"
        required
      />
      <Field
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={(value) => updateField('email', value)}
        onBlur={handleBlur}
        error={fieldErrors.email?.[0]}
        autoComplete="email"
        required
      />
      <Field
        label="Message"
        name="message"
        value={values.message}
        onChange={(value) => updateField('message', value)}
        onBlur={handleBlur}
        error={fieldErrors.message?.[0]}
        multiline
        required
      />
      <div aria-hidden="true" className={HONEYPOT_WRAPPER_CLASSES}>
        <label htmlFor={honeypotId}>Company</label>
        <input
          id={honeypotId}
          name={HONEYPOT_FIELD_NAME}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotValue}
          onChange={(event) => setHoneypotValue(event.target.value)}
        />
      </div>
      <button type="submit" disabled={isSubmitting} className={SUBMIT_BUTTON_CLASSES}>
        {isSubmitting ? 'Sending…' : submitLabel}
      </button>
      <p role="status" aria-live="polite" className="text-sm">
        {liveMessage}
      </p>
    </form>
  )
}

function describeStatus(
  status: 'idle' | 'submitting' | 'success' | 'error',
  successMessage: string,
  errorMessage: string,
): string {
  switch (status) {
    case 'submitting':
      return 'Sending your message…'
    case 'success':
      return successMessage
    case 'error':
      return errorMessage
    default:
      return ''
  }
}
