import type { MetadataRoute } from 'next'
import { buildCanonicalUrl } from './metadata'

const SITEMAP_PATH = '/sitemap.xml'
const ALL_USER_AGENTS = '*'
const ALL_PATHS = '/'

export interface SitemapRouteInput {
  /** Path relative to the site root, e.g. "/about". The root route is "/". */
  readonly path: string
  readonly lastModified?: Date | string
  readonly changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']
  readonly priority?: number
}

export interface BuildSitemapInput {
  /** Origin the site is served from, e.g. "https://example.com" — same value passed to `buildCanonicalUrl`/`buildMetadata`. */
  readonly siteUrl: string
  /** GitHub Pages project-page subpath, e.g. "/my-site". Mirrors `defineNextConfig`'s `basePath`. */
  readonly basePath?: string
  /**
   * Must match `trailingSlash` in the Next config — `defineNextConfig` sets
   * it `true` for the `github-pages` target.
   *
   * This exists because Next rewrites a page's rendered
   * `<link rel="canonical">` to carry a trailing slash when the option is
   * on, but does not touch sitemap URLs. Composing both from
   * `buildCanonicalUrl` is therefore not enough on its own: the canonical
   * ends up as `https://host/repo/` while the sitemap says
   * `https://host/repo`, and search engines treat those as two different
   * URLs pointing at the same content. Passing the flag keeps them
   * identical. Defaults to `false`, matching Next's own default.
   */
  readonly trailingSlash?: boolean
  readonly routes: readonly SitemapRouteInput[]
}

/**
 * Appends the trailing slash Next would add to a rendered canonical URL.
 * Left alone if one is already present, or if the URL has no path segment
 * beyond the origin (`https://example.com` stays as-is, matching Next).
 */
function applyTrailingSlash(url: string, trailingSlash: boolean): string {
  if (!trailingSlash || url.endsWith('/')) return url

  return `${url}/`
}

/**
 * Builds a `MetadataRoute.Sitemap` — the exact shape Next's `app/sitemap.ts`
 * convention expects as a default export's return value, which is also
 * emitted into the static HTML export as `sitemap.xml` under
 * `output: 'export'` (SPEC.md Deploy Targets; no server-only APIs used).
 *
 * Every entry's `url` is produced by `buildCanonicalUrl` — the same
 * function `buildMetadata` uses for a page's `<link rel="canonical">` — so
 * a sitemap entry for a route and that route's own canonical tag can never
 * disagree on basePath handling.
 */
export function buildSitemap(input: BuildSitemapInput): MetadataRoute.Sitemap {
  return input.routes.map((route) => ({
    url: applyTrailingSlash(
      buildCanonicalUrl(input.siteUrl, input.basePath, route.path),
      input.trailingSlash ?? false,
    ),
    ...(route.lastModified === undefined ? {} : { lastModified: route.lastModified }),
    ...(route.changeFrequency === undefined ? {} : { changeFrequency: route.changeFrequency }),
    ...(route.priority === undefined ? {} : { priority: route.priority }),
  }))
}

export interface BuildRobotsInput {
  /** Origin the site is served from, e.g. "https://example.com" — same value passed to `buildSitemap`. */
  readonly siteUrl: string
  /** GitHub Pages project-page subpath, e.g. "/my-site". Mirrors `defineNextConfig`'s `basePath`. */
  readonly basePath?: string
  /**
   * Whether this build is the production deploy. `true` allows crawling
   * everything and points crawlers at the sitemap; `false` (or omitted)
   * disallows everything.
   *
   * Defaults to `false` — i.e. **blocked** — because the failure mode of
   * defaulting to "allow" is a preview/staging deploy silently getting
   * indexed and competing with production in search results, which is
   * hard to undo (search engines cache and re-crawl on their own
   * schedule). The failure mode of defaulting to "block" is a production
   * build that forgot to pass the flag losing crawl traffic until
   * someone notices, which is immediately visible (no organic traffic,
   * a quick `curl /robots.txt` shows the cause) and trivially reversible
   * by setting the flag. Safe-by-default means the quiet, hard-to-detect
   * failure is the one that requires opting in.
   */
  readonly isProduction?: boolean
}

/**
 * Builds a `MetadataRoute.Robots` — the shape Next's `app/robots.ts`
 * convention expects as a default export's return value, emitted into the
 * static export as `robots.txt` under `output: 'export'`.
 */
export function buildRobots(input: BuildRobotsInput): MetadataRoute.Robots {
  const isProduction = input.isProduction ?? false

  return {
    rules: {
      userAgent: ALL_USER_AGENTS,
      ...(isProduction ? { allow: ALL_PATHS } : { disallow: ALL_PATHS }),
    },
    sitemap: buildCanonicalUrl(input.siteUrl, input.basePath, SITEMAP_PATH),
  }
}
