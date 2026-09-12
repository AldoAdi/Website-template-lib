'use client'

import type { ReactElement } from 'react'
import { useConsentFor } from '../../analytics/useConsentState'
import { grantConsent } from '../../analytics/consent'
import type { ConsentCategory } from '../../analytics/consent'

export interface MapEmbedProps {
  /**
   * The provider's embed URL -- for Google, the `https://www.google.com/maps/embed?pb=...`
   * form from "Share → Embed a map", not an ordinary maps link.
   */
  readonly embedUrl: string
  /**
   * Ordinary map link, opened in a new tab from the consent placeholder and
   * offered as the always-available alternative. Directions must never be
   * reachable only by accepting tracking.
   */
  readonly linkUrl: string
  /** Accessible name for the frame, e.g. `'Map to Listiyo Family Dental'`. */
  readonly title: string
  /**
   * Category that must be granted before the frame loads. Defaults to
   * `'marketing'`, which is where third-party map embeds land in every
   * consent taxonomy that has one -- the provider sets identifiers for its
   * own purposes the moment the frame loads, before the visitor interacts
   * with it at all.
   *
   * Pass `null` to load it unconditionally, which is only defensible where
   * a lawyer has said so.
   */
  readonly requireConsentFor?: ConsentCategory | null
  readonly className?: string
}

const FRAME_WRAPPER_CLASSES = 'border-border overflow-hidden rounded-lg border'

const PLACEHOLDER_CLASSES =
  'border-border bg-secondary text-secondary-foreground flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center'

/**
 * A consent-gated third-party map.
 *
 * Until the required category is granted this renders a placeholder with a
 * plain link to the map provider and an accept button -- never a blank box
 * and never the frame itself. Two things follow from that, both
 * deliberate:
 *
 * - A visitor who refuses tracking still gets directions. The link leaves
 *   the site, which is the visitor's own choice to make, rather than
 *   embedding the provider's cookies into a page they did not choose.
 * - The frame is `loading="lazy"` even after consent, because a map far
 *   down the page is the single heaviest thing on it.
 *
 * `referrerPolicy="no-referrer-when-downgrade"` matches what Google's own
 * embed snippet asks for; the frame is otherwise given no permissions.
 */
export function MapEmbed({
  embedUrl,
  linkUrl,
  title,
  requireConsentFor = 'marketing',
  className,
}: MapEmbedProps): ReactElement {
  // Hooks cannot be called conditionally, so the category is always
  // subscribed and the `null` case simply ignores the answer.
  const isGranted = useConsentFor(requireConsentFor ?? 'functional')
  const isAllowed = requireConsentFor === null || isGranted

  if (!isAllowed) {
    return (
      <div className={className ? `${PLACEHOLDER_CLASSES} ${className}` : PLACEHOLDER_CLASSES}>
        <p className="text-sm">
          The map is hosted by a third party that sets its own cookies, so it stays off until you
          allow it.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="border-border rounded-md border px-4 py-2 text-sm font-medium"
          >
            Open in maps
          </a>
          <button
            type="button"
            onClick={grantConsent}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            Allow and show map
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className ? `${FRAME_WRAPPER_CLASSES} ${className}` : FRAME_WRAPPER_CLASSES}>
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-[4/3] w-full border-0"
      />
    </div>
  )
}
