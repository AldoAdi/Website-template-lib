'use client'

import { useCallback, useState } from 'react'

export type FormPostStatus = 'idle' | 'submitting' | 'success' | 'error'

export interface UseFormPostResult {
  readonly status: FormPostStatus
  readonly errorMessage: string | null
  readonly submit: (payload: Readonly<Record<string, unknown>>) => Promise<boolean>
  readonly reset: () => void
}

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Posts a JSON payload to `endpoint` via a plain `fetch` and tracks the
 * idle/submitting/success/error lifecycle.
 *
 * Never throws into the caller: a network failure, a non-2xx response, or
 * a backend that responds 200 but reports `{ success: false }` all resolve
 * `submit()` to `false` and set a user-facing error message instead of
 * propagating an exception. This is what lets `ContactForm` show a
 * retryable error without losing what the visitor typed.
 *
 * Has no opinion on what `endpoint` is or what shape the payload takes --
 * the caller supplies both -- so swapping form backends is a props change
 * in `ContactForm`, not a change here.
 */
export function useFormPost(endpoint: string): UseFormPostResult {
  const [status, setStatus] = useState<FormPostStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reset = useCallback((): void => {
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  const submit = useCallback(
    async (payload: Readonly<Record<string, unknown>>): Promise<boolean> => {
      setStatus('submitting')
      setErrorMessage(null)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok || !(await respondedWithSuccess(response))) {
          setStatus('error')
          setErrorMessage(GENERIC_ERROR_MESSAGE)
          return false
        }

        setStatus('success')
        return true
      } catch {
        setStatus('error')
        setErrorMessage(GENERIC_ERROR_MESSAGE)
        return false
      }
    },
    [endpoint],
  )

  return { status, errorMessage, submit, reset }
}

/**
 * Web3Forms (and most form backends) return a `{ success: boolean }` body
 * even on an HTTP 200 -- a request can "land" but still be rejected by the
 * backend. A body that isn't JSON, or carries no `success` field, is
 * treated as success: `response.ok` already established the request was
 * accepted; this only catches the "received, but rejected" case.
 */
async function respondedWithSuccess(response: Response): Promise<boolean> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object' && 'success' in data) {
      return (data as { success: unknown }).success !== false
    }
    return true
  } catch {
    return true
  }
}
