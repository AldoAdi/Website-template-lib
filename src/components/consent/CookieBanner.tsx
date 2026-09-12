'use client'

import { useId, useState } from 'react'
import type { ReactElement } from 'react'
import { denyConsent, grantConsent } from '../../analytics/consent'
import { useConsentState } from '../../analytics/useConsentState'
import { ConsentPreferences } from './ConsentPreferences'

export interface CookieBannerProps {
  readonly message?: string
  readonly acceptLabel?: string
  readonly rejectLabel?: string
  /** Defaults to `'Manage preferences'`. */
  readonly preferencesLabel?: string
  /**
   * Set false to drop the per-category panel and ship a two-button banner.
   *
   * Only reasonable where the site loads no optional storage at all beyond
   * analytics; anywhere an advertising tag might appear, the granular panel
   * is the thing that makes the banner an actual choice.
   */
  readonly showPreferences?: boolean
}

const DEFAULT_MESSAGE =
  'We use cookies to understand how this site is used. Choose whether to allow analytics cookies.'
const DEFAULT_ACCEPT_LABEL = 'Accept'
const DEFAULT_REJECT_LABEL = 'Reject'
const DEFAULT_PREFERENCES_LABEL = 'Manage preferences'

const BUTTON_BASE_CLASSES = 'rounded-md px-4 py-2 text-sm font-medium'

/**
 * Fixed-position banner shown only while consent is undecided. Disappears
 * the moment a decision is made (accept, reject, or a saved set of
 * category choices) and, because it reads through the consent module rather
 * than local state, stays gone across reloads whenever storage is
 * available.
 *
 * Copy is entirely prop-driven with sensible English defaults -- this
 * component never bakes in site-specific marketing text.
 */
export function CookieBanner({
  message = DEFAULT_MESSAGE,
  acceptLabel = DEFAULT_ACCEPT_LABEL,
  rejectLabel = DEFAULT_REJECT_LABEL,
  preferencesLabel = DEFAULT_PREFERENCES_LABEL,
  showPreferences = true,
}: CookieBannerProps): ReactElement | null {
  const consentState = useConsentState()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const panelId = useId()

  if (consentState !== 'unknown') return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="gap-gutter px-gutter py-gutter border-border bg-background text-foreground fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-y-auto border-t shadow-lg sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-3 sm:max-w-xl">
        <p className="text-sm">{message}</p>
        {/* The panel lives inside the same region rather than in a modal
            dialog: the banner is already the topmost thing on the page, and
            a dialog here would trap focus over content the visitor has not
            been allowed to read yet. */}
        {showPreferences && isPanelOpen ? (
          <div id={panelId} className="border-border rounded-md border p-4">
            <ConsentPreferences />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {showPreferences ? (
          <button
            type="button"
            aria-expanded={isPanelOpen}
            aria-controls={panelId}
            onClick={() => setIsPanelOpen((open) => !open)}
            className={`${BUTTON_BASE_CLASSES} text-muted-foreground underline underline-offset-4`}
          >
            {preferencesLabel}
          </button>
        ) : null}
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
