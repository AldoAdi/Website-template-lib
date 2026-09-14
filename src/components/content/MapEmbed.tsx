'use client'

import { useEffect, type ReactElement } from 'react'
import { parseWebUrl } from '../../security/url'
import { useConsentFor } from '../../analytics/useConsentState'
import { getConsentCategories, setConsentCategories } from '../../analytics/consent'
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

const LOADED_CLASSES = 'flex flex-col gap-2'

const PLACEHOLDER_CLASSES =
  'border-border bg-secondary text-secondary-foreground flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center'

const PLACEHOLDER_LINK_CLASSES = 'border-border rounded-md border px-4 py-2 text-sm font-medium'

const LOADED_LINK_CLASSES = 'text-primary self-start text-sm underline underline-offset-4'

const GOOGLE_MAPS_HOSTS: ReadonlySet<string> = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
])

const GOOGLE_EMBED_PATH_PREFIX = '/maps/embed'

function withClassName(base: string, className: string | undefined): string {
  return className ? `${base} ${className}` : base
}

/**
 * The most common reason a Google map "fails to load" that CSP does not
 * explain: an ordinary maps link was passed instead of the embed URL, and
 * Google refuses to be framed at anything but `/maps/embed`.
 */
function isUnframeableGoogleUrl(url: URL): boolean {
  return GOOGLE_MAPS_HOSTS.has(url.hostname) && !url.pathname.startsWith(GOOGLE_EMBED_PATH_PREFIX)
}

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
 * Do not tighten it: a Maps Embed API key restricted by referrer path stops
 * loading without the full referrer.
 *
 * The directions link stays under the loaded frame too. A cross-origin
 * frame never reports a load failure to the page (`onError` does not fire,
 * `onLoad` fires on Google's error page), so when the map is blocked -- by
 * a CSP missing `frame-src`, an ad blocker, a bad URL -- the link is the
 * visitor's only way forward.
 *
 * `embedUrl` must be `https:` and `linkUrl` http(s); anything else is not
 * rendered at all.
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

  const embed = parseWebUrl(embedUrl, { requireAbsolute: true })
  const safeEmbedUrl = embed?.protocol === 'https:' ? embed.href : null
  const isLinkSafe = parseWebUrl(linkUrl) !== null

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (safeEmbedUrl === null) {
      console.warn(`[MapEmbed] embedUrl must be an https URL; not rendering "${embedUrl}".`)
    } else if (isUnframeableGoogleUrl(new URL(safeEmbedUrl))) {
      console.warn(
        `[MapEmbed] "${embedUrl}" is not a Google /maps/embed URL, and Google refuses to be framed anywhere else. Use Share -> Embed a map.`,
      )
    }
  }, [embedUrl, safeEmbedUrl])

  // Only reached when `requireConsentFor` is non-null (see `isAllowed`
  // above), so the placeholder's button always has a real category to grant.
  function allowMap(): void {
    if (requireConsentFor === null) return
    setConsentCategories({ ...getConsentCategories(), [requireConsentFor]: true })
  }

  function directionsLink(linkClasses: string): ReactElement | null {
    if (!isLinkSafe) return null
    return (
      <a href={linkUrl} target="_blank" rel="noreferrer" className={linkClasses}>
        Open in maps
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    )
  }

  if (safeEmbedUrl === null || !isAllowed) {
    return (
      <div className={withClassName(PLACEHOLDER_CLASSES, className)}>
        <p className="text-sm">
          {safeEmbedUrl === null
            ? 'The map cannot be shown here.'
            : 'The map is hosted by a third party that sets its own cookies, so it stays off until you allow it.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {directionsLink(PLACEHOLDER_LINK_CLASSES)}
          {safeEmbedUrl === null ? null : (
            <button
              type="button"
              onClick={allowMap}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
            >
              Allow and show map
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={withClassName(LOADED_CLASSES, className)}>
      <div className={FRAME_WRAPPER_CLASSES}>
        <iframe
          src={safeEmbedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-[4/3] w-full border-0"
        />
      </div>
      {directionsLink(LOADED_LINK_CLASSES)}
    </div>
  )
}
