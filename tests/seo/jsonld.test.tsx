import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import {
  JsonLd,
  buildOrganizationSchema,
  buildWebSiteSchema,
  serializeJsonLd,
} from '../../src/seo/jsonld'

afterEach(() => {
  cleanup()
})

describe('buildOrganizationSchema', () => {
  test('emits a valid Organization shape that parses back as JSON', () => {
    const schema = buildOrganizationSchema({
      name: 'Example Co',
      url: 'https://example.com',
      logoUrl: 'https://example.com/logo.png',
      sameAs: ['https://x.com/example'],
    })

    expect(JSON.parse(JSON.stringify(schema))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Example Co',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
      sameAs: ['https://x.com/example'],
    })
  })

  test('omits logo and sameAs when not provided', () => {
    const schema = buildOrganizationSchema({ name: 'Example Co', url: 'https://example.com' })

    expect(schema).not.toHaveProperty('logo')
    expect(schema).not.toHaveProperty('sameAs')
  })
})

describe('buildWebSiteSchema', () => {
  test('emits a valid WebSite shape that parses back as JSON', () => {
    const schema = buildWebSiteSchema({
      name: 'Example Site',
      url: 'https://example.com',
      description: 'A site about examples.',
    })

    expect(JSON.parse(JSON.stringify(schema))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Example Site',
      url: 'https://example.com',
      description: 'A site about examples.',
    })
  })

  test('omits description when not provided', () => {
    const schema = buildWebSiteSchema({ name: 'Example Site', url: 'https://example.com' })

    expect(schema).not.toHaveProperty('description')
  })
})

describe('serializeJsonLd', () => {
  test('escapes "<" so the payload cannot contain a literal </script>', () => {
    const hostile = { '@type': 'Organization', name: '</script><img src=x onerror=alert(1)>' }

    const serialized = serializeJsonLd(hostile)

    expect(serialized).not.toContain('</script>')
    expect(serialized).not.toContain('<!--')
    expect(serialized).toContain('\\u003c/script>')
    // Still valid JSON once un-escaped by a JSON parser (the '<' round-trips).
    expect(JSON.parse(serialized).name).toBe('</script><img src=x onerror=alert(1)>')
  })
})

describe('JsonLd', () => {
  test('renders an Organization and WebSite schema as separate ld+json script tags', () => {
    const organization = buildOrganizationSchema({ name: 'Example Co', url: 'https://example.com' })
    const website = buildWebSiteSchema({ name: 'Example Site', url: 'https://example.com' })

    const { container } = render(<JsonLd data={[organization, website]} />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')

    expect(scripts).toHaveLength(2)
    expect(JSON.parse(scripts[0]?.innerHTML ?? '')).toMatchObject({ '@type': 'Organization' })
    expect(JSON.parse(scripts[1]?.innerHTML ?? '')).toMatchObject({ '@type': 'WebSite' })
  })

  test('renders a single object as one script tag', () => {
    const website = buildWebSiteSchema({ name: 'Example Site', url: 'https://example.com' })

    const { container } = render(<JsonLd data={website} />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')

    expect(scripts).toHaveLength(1)
  })

  // The single most important test in this file: a hostile payload embedded
  // in structured data (e.g. an attacker-controlled organization name) must
  // not be able to close the surrounding <script> tag and inject markup.
  test('hostile input cannot break out of the script tag via dangerouslySetInnerHTML', () => {
    const hostile = buildOrganizationSchema({
      name: '</script><img src=x onerror=alert(1)>',
      url: 'https://example.com',
    })

    const { container } = render(<JsonLd data={hostile} />)

    // The raw closing sequence must never appear anywhere in the rendered markup.
    expect(container.innerHTML).not.toContain('</script><img')
    expect(container.querySelectorAll('img')).toHaveLength(0)

    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    expect(script?.innerHTML).not.toContain('</script>')
    expect(JSON.parse(script?.innerHTML ?? '').name).toBe(
      '</script><img src=x onerror=alert(1)>',
    )
  })
})
