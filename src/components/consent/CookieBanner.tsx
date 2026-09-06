'use client'

import { useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import {
  denyConsent,
  getConsentState,
  grantConsent,
  onConsentChange,
} from '../../analytics/consent'
import type { ConsentState } from '../../analytics/consent'

export interface CookieBannerProps {
  readonly message?: string
  readonly acceptLabel?: string
  readonly rejectLabel?: string
}

const DEFAULT_MESSAGE =
  'We use cookies to understand how this site is used. Choose whether to allow analytics cookies.'
const DEFAULT_ACCEPT_LABEL = 'Accept'
const DEFAULT_REJECT_LABEL = 'Reject'

const BUTTON_BASE_CLASSES = 'rounded-md px-4 py-2 text-sm font-medium'

// useSyncExternalStore's subscribe contract takes a callback with no
// arguments -- it only needs to know "something changed", then re-invokes
// the snapshot getter itself. `onConsentChange` is the module's general
// pub/sub API and passes the new state to its listener; this adapter just
// ignores that argument.
function subscribe(onStoreChange: () => void): () => void {
  return onConsentChange(() => onStoreChange())
}

// The server cannot know the visitor's stored decision, so it cannot render
// the correct one -- this is the exact server/client split ThemeToggle
// documents. Both the server render and the client's first paint therefore
// report 'unknown' (banner visible); the real, possibly-hidden state swaps
// in a moment later once mounted, which is a state update rather than a
// disagreement between server and client markup, so no hydration mismatch.
function getServerSnapshot(): ConsentState {
  return 'unknown'
}

function useConsentState(): ConsentState {
  return useSyncExternalStore(subscribe, getConsentState, getServerSnapshot)
}

/**
 * Fixed-position banner shown only while consent is undecided. Disappears
 * the moment a decision is made (accept or reject) and, because it reads
 * through the consent module rather than local state, stays gone across
 * reloads whenever storage is available.
 *
 * Copy is entirely prop-driven with sensible English defaults -- this
 * component never bakes in site-specific marketing text.
 */
export function CookieBanner({
  message = DEFAULT_MESSAGE,
  acceptLabel = DEFAULT_ACCEPT_LABEL,
  rejectLabel = DEFAULT_REJECT_LABEL,
}: CookieBannerProps): ReactElement | null {
  const consentState = useConsentState()

  if (consentState !== 'unknown') return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-gutter border-t border-border bg-background px-gutter py-gutter text-foreground shadow-lg sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm">{message}</p>
      <div className="flex shrink-0 gap-2">
        {/* Reject and Accept are styled with the same size and equal
            visual weight -- one is not a de-emphasized link next to a
            prominent button. */}
        <button
          type="button"
          onClick={denyConsent}
          className={`${BUTTON_BASE_CLASSES} bg-secondary text-secondary-foreground`}
        >
          {rejectLabel}
        </button>
        <button
          type="button"
          onClick={grantConsent}
          className={`${BUTTON_BASE_CLASSES} bg-primary text-primary-foreground`}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  )
}
