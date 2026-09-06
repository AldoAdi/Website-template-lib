import { describe, expect, test } from 'vitest'
import { buildCanonicalUrl, buildMetadata } from '../../src/seo/metadata'
import type { SiteMetadataConfig } from '../../src/seo/metadata'

const SITE: SiteMetadataConfig = {
  siteUrl: 'https://example.com',
  siteName: 'Example Site',
  defaultTitle: 'Example Site — Home',
  description: 'A site about examples.',
}

describe('buildCanonicalUrl', () => {
  test('resolves the site root when no basePath is given', () => {
    expect(buildCanonicalUrl('https://example.com', undefined, '/')).toBe('https://example.com')
  })

  test('resolves the site root under a basePath', () => {
    expect(buildCanonicalUrl('https://user.github.io', '/my-site', '/')).toBe(
      'https://user.github.io/my-site',
    )
  })

  test('prefixes a subpage with the basePath, not just the site root', () => {
    expect(buildCanonicalUrl('https://user.github.io', '/my-site', '/about')).toBe(
      'https://user.github.io/my-site/about',
    )
  })

  test('resolves a subpage with no basePath', () => {
    expect(buildCanonicalUrl('https://example.com', undefined, '/about')).toBe(
      'https://example.com/about',
    )
  })

  test('tolerates a path with no leading slash', () => {
    expect(buildCanonicalUrl('https://example.com', '/my-site', 'about')).toBe(
      'https://example.com/my-site/about',
    )
  })

  test('tolerates a path with a trailing slash', () => {
    expect(buildCanonicalUrl('https://example.com', '/my-site', '/about/')).toBe(
      'https://example.com/my-site/about',
    )
  })

  test('tolerates a basePath with a trailing slash', () => {
    expect(buildCanonicalUrl('https://example.com', '/my-site/', '/about')).toBe(
      'https://example.com/my-site/about',
    )
  })

  test('tolerates a basePath with no leading slash', () => {
    expect(buildCanonicalUrl('https://example.com', 'my-site', '/about')).toBe(
      'https://example.com/my-site/about',
    )
  })

  test('tolerates a trailing slash on the site url itself', () => {
    expect(buildCanonicalUrl('https://example.com/', '/my-site', '/about')).toBe(
      'https://example.com/my-site/about',
    )
  })

  test('treats an empty basePath the same as no basePath', () => {
    expect(buildCanonicalUrl('https://example.com', '', '/about')).toBe('https://example.com/about')
  })

  test('defaults the path to the site root when omitted', () => {
    expect(buildCanonicalUrl('https://example.com', undefined)).toBe('https://example.com')
  })
})

describe('buildMetadata', () => {
  test('produces a title template and default title', () => {
    const metadata = buildMetadata(SITE)

    expect(metadata.title).toEqual({
      template: '%s | Example Site',
      default: 'Example Site — Home',
    })
  })

  test('respects a custom title template', () => {
    const metadata = buildMetadata({ ...SITE, titleTemplate: '%s :: Example' })

    expect(metadata.title).toEqual({ template: '%s :: Example', default: 'Example Site — Home' })
  })

  test('produces the site description by default', () => {
    const metadata = buildMetadata(SITE)

    expect(metadata.description).toBe('A site about examples.')
  })

  test('produces a canonical alternate under the site basePath', () => {
    const metadata = buildMetadata(
      { ...SITE, siteUrl: 'https://user.github.io', basePath: '/my-site' },
      {
        path: '/about',
      },
    )

    expect(metadata.alternates).toEqual({ canonical: 'https://user.github.io/my-site/about' })
  })

  test('produces Open Graph fields shaped for a website', () => {
    const metadata = buildMetadata(SITE, {
      path: '/about',
      title: 'About',
      description: 'About us',
    })

    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      title: 'About',
      description: 'About us',
      url: 'https://example.com/about',
      siteName: 'Example Site',
      locale: 'en_US',
    })
  })

  test('includes an Open Graph image when the site provides one', () => {
    const metadata = buildMetadata({
      ...SITE,
      image: { url: 'https://example.com/og.png', width: 1200, height: 630, alt: 'Example' },
    })

    expect(metadata.openGraph).toMatchObject({
      images: [{ url: 'https://example.com/og.png', width: 1200, height: 630, alt: 'Example' }],
    })
  })

  test('produces a summary Twitter card when there is no image', () => {
    const metadata = buildMetadata(SITE)

    expect(metadata.twitter).toMatchObject({
      card: 'summary',
      title: 'Example Site — Home',
      description: 'A site about examples.',
    })
  })

  test('produces a summary_large_image Twitter card when there is an image', () => {
    const metadata = buildMetadata({ ...SITE, image: { url: 'https://example.com/og.png' } })

    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['https://example.com/og.png'],
    })
  })

  test('attaches the twitter handle as both site and creator when given', () => {
    const metadata = buildMetadata({ ...SITE, twitterHandle: '@example' })

    expect(metadata.twitter).toMatchObject({ site: '@example', creator: '@example' })
  })

  test('overriding the per-page title does not change the site title template', () => {
    const metadata = buildMetadata(SITE, { title: 'Custom Page Title' })

    expect(metadata.title).toEqual({ template: '%s | Example Site', default: 'Custom Page Title' })
  })

  test('overriding the per-page description replaces the site default everywhere it is used', () => {
    const metadata = buildMetadata(SITE, { description: 'Custom page description' })

    expect(metadata.description).toBe('Custom page description')
    expect(metadata.openGraph).toMatchObject({ description: 'Custom page description' })
    expect(metadata.twitter).toMatchObject({ description: 'Custom page description' })
  })

  test('per-page image overrides the site default image', () => {
    const metadata = buildMetadata(
      { ...SITE, image: { url: 'https://example.com/site.png' } },
      { image: { url: 'https://example.com/page.png' } },
    )

    expect(metadata.openGraph).toMatchObject({ images: [{ url: 'https://example.com/page.png' }] })
  })
})
