import type { Metadata } from 'next'

// `next` does not publicly export its OpenGraph/Twitter member types, only
// the top-level `Metadata` interface — derive them from it rather than
// reaching into `next/dist/...` internals.
type OpenGraphMetadata = NonNullable<Metadata['openGraph']>
type TwitterMetadata = NonNullable<Metadata['twitter']>

const DEFAULT_LOCALE = 'en_US'
const DEFAULT_PATH = '/'

export interface SeoImage {
  readonly url: string
  readonly width?: number
  readonly height?: number
  readonly alt?: string
}

export interface SiteMetadataConfig {
  /** Origin the site is served from, e.g. "https://example.com" — no basePath, no trailing slash needed. */
  readonly siteUrl: string
  /** GitHub Pages project-page subpath, e.g. "/my-site". Omit for a root-served site. Mirrors `defineNextConfig`'s `basePath`. */
  readonly basePath?: string
  readonly siteName: string
  /** `%s`-style title template. Defaults to `"%s | <siteName>"`. */
  readonly titleTemplate?: string
  readonly defaultTitle: string
  readonly description: string
  /** Open Graph locale, e.g. "en_US". Defaults to "en_US". */
  readonly locale?: string
  readonly image?: SeoImage
  /** Twitter/X handle including the leading "@", used for both `site` and `creator`. */
  readonly twitterHandle?: string
}

export interface PageMetadataInput {
  /** Path relative to the site root, e.g. "/about". Defaults to "/" (the site root). */
  readonly path?: string
  readonly title?: string
  readonly description?: string
  readonly image?: SeoImage
}

/**
 * Joins a site's base URL, its (optional) `basePath`, and a page path into
 * one canonical URL. Pure and testable — takes both inputs explicitly
 * rather than reading `process.env`, so the same site config that produced
 * `defineNextConfig({ target: 'github-pages', repoName })`'s `basePath` can
 * be threaded straight into this function.
 *
 * Every segment is normalized independently (leading/trailing slashes are
 * tolerated on `basePath` and `path` alike) so a canonical for "/about"
 * lands on `https://<siteUrl>/<basePath>/about`, never dropping or
 * duplicating the basePath segment.
 */
export function buildCanonicalUrl(
  siteUrl: string,
  basePath: string | undefined,
  path: string = DEFAULT_PATH,
): string {
  const base = stripTrailingSlashes(siteUrl)
  const normalizedBasePath = normalizeBasePath(basePath)
  const normalizedPath = normalizePagePath(path)
  const combined = `${base}${normalizedBasePath}${normalizedPath}`

  return combined === '' ? base : combined
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function withLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`
}

function normalizeBasePath(basePath: string | undefined): string {
  if (basePath === undefined || basePath === '') return ''

  return stripTrailingSlashes(withLeadingSlash(basePath))
}

function normalizePagePath(path: string): string {
  if (path === '' || path === '/') return ''

  return stripTrailingSlashes(withLeadingSlash(path))
}

/**
 * Builds a Next `Metadata` object for one page: title (with template),
 * description, canonical URL, Open Graph, and a Twitter card. Per-page
 * `title`/`description`/`image` override the site defaults; everything
 * else is derived from `site`.
 *
 * No server-only APIs are used, so this works unchanged under
 * `output: 'export'` (SPEC.md Deploy Targets).
 */
export function buildMetadata(site: SiteMetadataConfig, page: PageMetadataInput = {}): Metadata {
  const path = page.path ?? DEFAULT_PATH
  const canonicalUrl = buildCanonicalUrl(site.siteUrl, site.basePath, path)
  const title = page.title ?? site.defaultTitle
  const description = page.description ?? site.description
  const image = page.image ?? site.image
  const locale = site.locale ?? DEFAULT_LOCALE
  const titleTemplate = site.titleTemplate ?? `%s | ${site.siteName}`

  return {
    title: { template: titleTemplate, default: title },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: buildOpenGraph({ title, description, url: canonicalUrl, site, image, locale }),
    twitter: buildTwitter({ title, description, image, twitterHandle: site.twitterHandle }),
  }
}

function buildOpenGraph(input: {
  readonly title: string
  readonly description: string
  readonly url: string
  readonly site: SiteMetadataConfig
  readonly image: SeoImage | undefined
  readonly locale: string
}): OpenGraphMetadata {
  return {
    type: 'website',
    title: input.title,
    description: input.description,
    url: input.url,
    siteName: input.site.siteName,
    locale: input.locale,
    ...(input.image === undefined ? {} : { images: [toOgImage(input.image)] }),
  }
}

function toOgImage(image: SeoImage): { url: string; width?: number; height?: number; alt?: string } {
  return {
    url: image.url,
    ...(image.width === undefined ? {} : { width: image.width }),
    ...(image.height === undefined ? {} : { height: image.height }),
    ...(image.alt === undefined ? {} : { alt: image.alt }),
  }
}

function buildTwitter(input: {
  readonly title: string
  readonly description: string
  readonly image: SeoImage | undefined
  readonly twitterHandle: string | undefined
}): TwitterMetadata {
  const handleFields =
    input.twitterHandle === undefined ? {} : { site: input.twitterHandle, creator: input.twitterHandle }

  if (input.image === undefined) {
    return { card: 'summary', title: input.title, description: input.description, ...handleFields }
  }

  return {
    card: 'summary_large_image',
    title: input.title,
    description: input.description,
    images: [input.image.url],
    ...handleFields,
  }
}
