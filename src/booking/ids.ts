/**
 * Visitor and session identity for the booking funnel.
 *
 * These live in first-party cookies rather than `localStorage` for one
 * specific reason: a cookie is sent with the request, so if a site later
 * mounts the ingest route handler (`./booking/server`), the server can read
 * the same ids the browser is emitting without a round-trip or a body
 * field it would have to trust. Until then they behave exactly like any
 * other client-side store.
 *
 * Neither id says anything about who the visitor is. They exist to stitch a
 * `booking_view` to the `booking_handoff` that follows it.
 */

export const VISITOR_COOKIE = 'bk_vid'
export const SESSION_COOKIE = 'bk_sid'

/**
 * Chrome caps JavaScript-set cookie lifetime at 400 days and silently
 * truncates anything longer, so asking for more would be a lie in the code.
 */
export const VISITOR_TTL_SECONDS = 400 * 24 * 60 * 60

/** Matches GA4's session window, so our funnel and GA4's sessions line up. */
export const SESSION_TTL_MS = 30 * 60 * 1000
const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000

function isBrowser(): boolean {
  return typeof document !== 'undefined'
}

/**
 * `crypto.randomUUID` is unavailable on insecure origins and in older
 * Safari. The fallback is not cryptographically strong and does not need to
 * be -- a collision costs one mis-stitched funnel row, not a security
 * boundary.
 */
function randomId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined

  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function readCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined

  for (const entry of document.cookie.split(';')) {
    const separator = entry.indexOf('=')
    if (separator === -1) continue

    if (entry.slice(0, separator).trim() !== name) continue

    try {
      return decodeURIComponent(entry.slice(separator + 1).trim())
    } catch {
      return undefined
    }
  }

  return undefined
}

/**
 * `SameSite=Lax` rather than `Strict`: the visitor arrives from an ad click
 * on another origin, and `Strict` would withhold the cookie on exactly that
 * navigation -- the one we most need to attribute.
 *
 * `Secure` is omitted on plain-HTTP origins because a browser rejects a
 * `Secure` cookie there outright, which would silently break local
 * development while looking like a bug in the funnel.
 */
export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (!isBrowser()) return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
}

/** Returns the visitor's stable id, minting and persisting one if absent. */
export function getVisitorId(): string {
  const existing = readCookie(VISITOR_COOKIE)
  if (existing !== undefined && existing !== '') return existing

  const minted = randomId()
  writeCookie(VISITOR_COOKIE, minted, VISITOR_TTL_SECONDS)
  return minted
}

/**
 * Returns the current session id, minting a new one after
 * `SESSION_TTL_MS` of inactivity.
 *
 * Every call refreshes the cookie's `Max-Age`, so the window is rolling:
 * a visitor reading three service pages before booking stays in one
 * session, which is what makes the funnel readable.
 */
export function getSessionId(): string {
  const existing = readCookie(SESSION_COOKIE)

  if (existing !== undefined && existing !== '') {
    writeCookie(SESSION_COOKIE, existing, SESSION_TTL_SECONDS)
    return existing
  }

  const minted = randomId()
  writeCookie(SESSION_COOKIE, minted, SESSION_TTL_SECONDS)
  return minted
}
