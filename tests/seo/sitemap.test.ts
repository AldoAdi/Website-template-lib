import { describe, expect, test } from 'vitest'
import { buildRobots, buildSitemap } from '../../src/seo/sitemap'
import { buildCanonicalUrl } from '../../src/seo/metadata'

const SITE_URL = 'https://user.github.io'
const BASE_PATH = '/my-site'

describe('buildSitemap', () => {
  test('produces an absolute URL that includes the basePath for the root route', () => {
    const sitemap = buildSitemap({
      siteUrl: SITE_URL,
      basePath: BASE_PATH,
      routes: [{ path: '/' }],
    })

    expect(sitemap[0]?.url).toBe('https://user.github.io/my-site')
  })

  test('produces an absolute URL that includes the basePath for a subpage', () => {
    const sitemap = buildSitemap({
      siteUrl: SITE_URL,
      basePath: BASE_PATH,
      routes: [{ path: '/about' }],
    })

    expect(sitemap[0]?.url).toBe('https://user.github.io/my-site/about')
  })

  test('agrees exactly with buildCanonicalUrl for the same inputs, root and subpage alike', () => {
    const routes = ['/', '/about'] as const

    const sitemap = buildSitemap({
      siteUrl: SITE_URL,
      basePath: BASE_PATH,
      routes: routes.map((path) => ({ path })),
    })

    routes.forEach((path, index) => {
      expect(sitemap[index]?.url).toBe(buildCanonicalUrl(SITE_URL, BASE_PATH, path))
    })
  })

  test('carries through optional lastModified, changeFrequency, and priority', () => {
    const sitemap = buildSitemap({
      siteUrl: SITE_URL,
      routes: [
        { path: '/about', lastModified: '2026-01-01', changeFrequency: 'monthly', priority: 0.5 },
      ],
    })

    expect(sitemap[0]).toMatchObject({
      lastModified: '2026-01-01',
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  })

  test('omits optional fields entirely when not provided', () => {
    const sitemap = buildSitemap({ siteUrl: SITE_URL, routes: [{ path: '/' }] })

    expect(sitemap[0]).not.toHaveProperty('lastModified')
    expect(sitemap[0]).not.toHaveProperty('changeFrequency')
    expect(sitemap[0]).not.toHaveProperty('priority')
  })

  test('produces one entry per route, in order', () => {
    const sitemap = buildSitemap({
      siteUrl: SITE_URL,
      routes: [{ path: '/' }, { path: '/about' }, { path: '/contact' }],
    })

    expect(sitemap.map((entry) => entry.url)).toEqual([
      'https://user.github.io',
      'https://user.github.io/about',
      'https://user.github.io/contact',
    ])
  })
})

describe('buildRobots', () => {
  test('on production, allows everything', () => {
    const robots = buildRobots({ siteUrl: SITE_URL, basePath: BASE_PATH, isProduction: true })

    expect(robots.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })

  test('on production, does not disallow anything', () => {
    const robots = buildRobots({ siteUrl: SITE_URL, isProduction: true })
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules]

    rules.forEach((rule) => expect(rule).not.toHaveProperty('disallow'))
  })

  test('on production, references the sitemap URL built the same way buildSitemap builds URLs', () => {
    const robots = buildRobots({ siteUrl: SITE_URL, basePath: BASE_PATH, isProduction: true })

    expect(robots.sitemap).toBe(buildCanonicalUrl(SITE_URL, BASE_PATH, '/sitemap.xml'))
  })

  test('on preview (isProduction: false), disallows everything', () => {
    const robots = buildRobots({ siteUrl: SITE_URL, isProduction: false })

    expect(robots.rules).toMatchObject({ userAgent: '*', disallow: '/' })
  })

  test('on preview, does not allow anything', () => {
    const robots = buildRobots({ siteUrl: SITE_URL, isProduction: false })
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules]

    rules.forEach((rule) => expect(rule).not.toHaveProperty('allow'))
  })

  // Safe default: when the production/preview flag is omitted entirely,
  // buildRobots blocks crawling (same as an explicit preview deploy).
  // Defaulting to "allow" risks a preview build getting indexed and
  // competing with production in search results -- a quiet failure that's
  // hard to reverse. Defaulting to "block" risks a production build that
  // forgot to pass the flag losing crawl traffic -- an immediately visible,
  // trivially reversible failure. The safe default is the one that fails loud.
  test('defaults to blocking everything when the production flag is omitted', () => {
    const robots = buildRobots({ siteUrl: SITE_URL })

    expect(robots.rules).toMatchObject({ userAgent: '*', disallow: '/' })
  })
})

describe('buildSitemap trailingSlash', () => {
  // Regression guard for a mismatch that unit tests alone did not catch and
  // only the built output revealed: both the canonical tag and the sitemap
  // entry were composed from buildCanonicalUrl, so an equality test passed
  // -- but Next rewrites the *rendered* canonical to carry a trailing slash
  // when trailingSlash is on, and leaves the sitemap untouched. The live
  // page said https://host/repo/ while the sitemap said https://host/repo.
  const SITE = 'https://aldoadi.github.io'
  const BASE = '/website-starter-usingtemplate-1'

  test('adds the trailing slash Next adds to the canonical, for the root route', () => {
    const [entry] = buildSitemap({
      siteUrl: SITE,
      basePath: BASE,
      trailingSlash: true,
      routes: [{ path: '/' }],
    })

    expect(entry?.url).toBe('https://aldoadi.github.io/website-starter-usingtemplate-1/')
  })

  test('adds it for a subpage too', () => {
    const [entry] = buildSitemap({
      siteUrl: SITE,
      basePath: BASE,
      trailingSlash: true,
      routes: [{ path: '/about' }],
    })

    expect(entry?.url).toBe('https://aldoadi.github.io/website-starter-usingtemplate-1/about/')
  })

  test('omitted, it defaults off -- matching Next own default', () => {
    const [entry] = buildSitemap({
      siteUrl: SITE,
      basePath: BASE,
      routes: [{ path: '/about' }],
    })

    expect(entry?.url).toBe('https://aldoadi.github.io/website-starter-usingtemplate-1/about')
  })

  test('never doubles an existing slash', () => {
    const [entry] = buildSitemap({
      siteUrl: SITE,
      basePath: BASE,
      trailingSlash: true,
      routes: [{ path: '/about/' }],
    })

    expect(entry?.url).not.toContain('//about')
    expect(entry?.url.endsWith('//')).toBe(false)
  })
})
