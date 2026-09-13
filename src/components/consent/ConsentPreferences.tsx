'use client'

import { useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import {
  CONSENT_CATEGORIES,
  getConsentCategories,
  setConsentCategories,
} from '../../analytics/consent'
import type { ConsentCategories, ConsentCategory } from '../../analytics/consent'

const subscribeToNothing = (): (() => void) => () => {}

/**
 * True once the panel has hydrated on the client -- same `useSyncExternalStore`
 * trick as `ThemeToggle`'s `useIsMounted`, for the same reason: the server
 * cannot read `localStorage`, so it cannot know a stored decision, so the
 * server markup and the client's first paint must agree on *not* knowing it.
 * The real values swap in a moment later, once mounted.
 */
function useIsMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

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

// What the panel shows before it can read storage: everything optional off,
// `functional` on -- the same answer `getConsentCategories()` gives for an
// unknown decision. Used only for the server render and the client's first
// paint, so the two agree and hydration does not report a mismatch.
const SERVER_SAFE_CATEGORIES: ConsentCategories = {
  functional: true,
  preferences: false,
  statistics: false,
  marketing: false,
}

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
 * State is owned locally so ticking a box does not write anything -- nothing
 * is persisted until Save. A panel that applies each toggle immediately has
 * no meaningful cancel.
 *
 * It is seeded from storage rather than once at construction, though: the
 * server cannot read storage at all, so a plain `useState(getConsentCategories)`
 * bakes the server's empty answer into the client's state forever, and a
 * visitor who already granted consent on a prior visit sees unchecked boxes
 * until they touch one. `draft` stays `null` until the visitor edits a box;
 * until then the checkboxes track `getConsentCategories()` live (gated by
 * `isMounted`, so the client's first paint still matches the server's
 * markup), and the moment they edit one, `draft` takes over and nothing --
 * not a re-render, not a consent change fired elsewhere -- overwrites it.
 */
export function ConsentPreferences({
  labels,
  descriptions,
  saveLabel = 'Save preferences',
  alwaysActiveLabel = 'Always active',
  onSave,
  className,
}: ConsentPreferencesProps): ReactElement {
  const isMounted = useIsMounted()
  const [draft, setDraft] = useState<ConsentCategories | null>(null)

  const stored = isMounted ? getConsentCategories() : SERVER_SAFE_CATEGORIES
  const current = draft ?? stored

  function toggle(category: ConsentCategory, checked: boolean): void {
    setDraft({ ...current, [category]: checked })
  }

  function save(): void {
    setConsentCategories(current)
    onSave?.(current)
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
                  checked={current[category]}
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
