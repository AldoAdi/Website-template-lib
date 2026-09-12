'use client'

import { useState } from 'react'
import type { ReactElement } from 'react'
import {
  CONSENT_CATEGORIES,
  getConsentCategories,
  setConsentCategories,
} from '../../analytics/consent'
import type { ConsentCategories, ConsentCategory } from '../../analytics/consent'

export interface ConsentPreferencesProps {
  /** Per-category heading. Defaults are plain English; override to translate. */
  readonly labels?: Partial<Record<ConsentCategory, string>>
  /** Per-category explanation shown under the label. */
  readonly descriptions?: Partial<Record<ConsentCategory, string>>
  /** Defaults to `'Save preferences'`. */
  readonly saveLabel?: string
  /** Shown beside the locked `functional` row. Defaults to `'Always active'`. */
  readonly alwaysActiveLabel?: string
  /** Called after the decision is persisted -- close a dialog, show a toast. */
  readonly onSave?: (categories: ConsentCategories) => void
  readonly className?: string
}

const DEFAULT_LABELS: Record<ConsentCategory, string> = {
  functional: 'Functional',
  preferences: 'Preferences',
  statistics: 'Statistics',
  marketing: 'Marketing',
}

const DEFAULT_DESCRIPTIONS: Record<ConsentCategory, string> = {
  functional:
    'Strictly necessary storage: remembering this choice, your light or dark theme, and keeping a booking you started.',
  preferences: 'Remembers settings you have chosen, so the site does not ask again every visit.',
  statistics: 'Anonymous counts of which pages are read and which buttons are used.',
  marketing: 'Lets advertising platforms recognise you here and on other sites.',
}

const ROW_CLASSES = 'flex flex-col gap-1 border-border border-t py-3 first:border-t-0'

/**
 * The four-category consent panel.
 *
 * Rendered both inside `CookieBanner` (behind its preferences button) and
 * standalone on a privacy page, because a banner that offers granular
 * choice once and then never again is the same dark pattern as no choice at
 * all -- the decision has to stay reachable after it is made.
 *
 * `functional` renders as a checked, disabled checkbox rather than being
 * omitted: hiding strictly-necessary storage makes the panel look like it
 * covers everything the site stores when it does not. A disabled input is
 * still in the accessibility tree, so the row is announced along with its
 * "always active" note.
 *
 * State is seeded once from storage and then owned locally, so ticking a
 * box does not write anything -- nothing is persisted until Save. A panel
 * that applies each toggle immediately has no meaningful cancel.
 */
export function ConsentPreferences({
  labels,
  descriptions,
  saveLabel = 'Save preferences',
  alwaysActiveLabel = 'Always active',
  onSave,
  className,
}: ConsentPreferencesProps): ReactElement {
  const [draft, setDraft] = useState<ConsentCategories>(getConsentCategories)

  function toggle(category: ConsentCategory, checked: boolean): void {
    setDraft((current) => ({ ...current, [category]: checked }))
  }

  function save(): void {
    setConsentCategories(draft)
    onSave?.(draft)
  }

  return (
    <div className={className}>
      <div className="flex flex-col">
        {CONSENT_CATEGORIES.map((category) => {
          const isLocked = category === 'functional'
          const label = labels?.[category] ?? DEFAULT_LABELS[category]

          return (
            <div key={category} className={ROW_CLASSES}>
              <label className="flex items-center justify-between gap-4 text-sm font-semibold">
                <span>{label}</span>
                {isLocked ? (
                  <span className="text-muted-foreground text-xs font-normal">
                    {alwaysActiveLabel}
                  </span>
                ) : null}
                <input
                  type="checkbox"
                  className="accent-primary size-4 shrink-0"
                  checked={draft[category]}
                  disabled={isLocked}
                  onChange={(event) => toggle(category, event.currentTarget.checked)}
                />
              </label>
              <p className="text-muted-foreground text-xs">
                {descriptions?.[category] ?? DEFAULT_DESCRIPTIONS[category]}
              </p>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={save}
        className="bg-primary text-primary-foreground mt-4 w-full rounded-md px-4 py-2 text-sm font-medium"
      >
        {saveLabel}
      </button>
    </div>
  )
}
