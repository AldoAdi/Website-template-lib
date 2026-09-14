const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:'])

// Only used to resolve relative paths so their protocol can be checked; the
// host never matters, and a fixed base keeps this safe to call during SSR.
const RELATIVE_BASE = 'https://relative.invalid'

/**
 * Parses a caller-supplied URL and accepts it only if it is http(s).
 *
 * React 19 blocks `javascript:` in JSX `href`/`src`, but not `data:` in an
 * iframe `src`, and nothing guards `location.replace`. Relative paths are
 * accepted (they resolve to this site) unless `requireAbsolute` is set.
 */
export function parseWebUrl(raw: string, { requireAbsolute = false } = {}): URL | null {
  try {
    const url = requireAbsolute ? new URL(raw) : new URL(raw, RELATIVE_BASE)
    return WEB_PROTOCOLS.has(url.protocol) ? url : null
  } catch {
    return null
  }
}
