'use client'

import { useId } from 'react'
import type { ChangeEvent, ReactElement, Ref } from 'react'

export type FieldElement = HTMLInputElement | HTMLTextAreaElement

export interface FieldProps {
  readonly label: string
  readonly name: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onBlur: () => void
  /** Field-level error message. Presence alone drives `aria-invalid`/`aria-describedby`. */
  readonly error?: string
  readonly type?: 'text' | 'email'
  readonly multiline?: boolean
  readonly required?: boolean
  readonly autoComplete?: string
  /** React 19 accepts `ref` as a plain prop -- no `forwardRef` needed. Lets a failed submit move focus to the first invalid control. */
  readonly ref?: Ref<FieldElement>
}

const FIELD_CLASSES =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground aria-invalid:border-destructive'
const LABEL_CLASSES = 'text-sm font-medium'
const ERROR_CLASSES = 'text-sm text-destructive'
const TEXTAREA_ROWS = 5

/**
 * A labeled input or textarea wired for accessible error reporting: the
 * error message, when present, gets a real element id, the control's
 * `aria-describedby` points at it, and `aria-invalid` always reflects
 * whether an error is currently showing.
 */
export function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  multiline = false,
  required = false,
  autoComplete,
  ref,
}: FieldProps): ReactElement {
  const id = useId()
  const errorId = `${id}-error`
  const hasError = Boolean(error)
  const describedBy = hasError ? errorId : undefined

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    onChange(event.target.value)
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASSES}>
        {label}
        {/* `required` on the control already conveys this to assistive tech; the asterisk is for sighted users scanning the form. */}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {multiline ? (
        <textarea
          ref={ref as Ref<HTMLTextAreaElement>}
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          rows={TEXTAREA_ROWS}
          className={FIELD_CLASSES}
        />
      ) : (
        <input
          ref={ref as Ref<HTMLInputElement>}
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={FIELD_CLASSES}
        />
      )}
      {/* No `role="alert"`: ContactForm renders up to three Fields at once, and
          three simultaneous alerts on submit talk over each other. Failed
          submit instead moves focus to the first invalid control, which
          announces this text via aria-describedby. */}
      {hasError ? (
        <p id={errorId} className={ERROR_CLASSES}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
