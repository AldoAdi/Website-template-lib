import { describe, expect, test } from 'vitest'
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildLocalBusinessSchema,
  buildPersonSchema,
  buildServiceSchema,
  buildWebPageSchema,
} from '../../src/seo/schema'

const ADDRESS = {
  street: '5580 2nd St #206',
  locality: 'Long Beach',
  region: 'CA',
  postalCode: '90803',
  country: 'US',
}

describe('buildLocalBusinessSchema', () => {
  test('defaults to LocalBusiness and keeps the address nested as a PostalAddress', () => {
    const schema = buildLocalBusinessSchema({
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
    })

    expect(schema['@type']).toBe('LocalBusiness')
    expect(schema['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '5580 2nd St #206',
      addressLocality: 'Long Beach',
      addressRegion: 'CA',
      postalCode: '90803',
      addressCountry: 'US',
    })
  })

  test('accepts a narrower type', () => {
    const schema = buildLocalBusinessSchema({
      type: 'Dentist',
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
    })

    expect(schema['@type']).toBe('Dentist')
  })

  test('omits every optional key rather than emitting undefined', () => {
    const schema = buildLocalBusinessSchema({
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
    })

    for (const key of [
      'telephone',
      'image',
      'priceRange',
      'geo',
      'openingHoursSpecification',
      'sameAs',
    ]) {
      expect(key in schema).toBe(false)
    }
  })

  test('expands opening hours into one specification per range', () => {
    const schema = buildLocalBusinessSchema({
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
      openingHours: [
        { days: ['Monday', 'Tuesday', 'Wednesday'], opens: '08:00', closes: '17:00' },
        { days: ['Thursday'], opens: '07:00', closes: '16:00' },
      ],
    })

    expect(schema['openingHoursSpecification']).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday'],
        opens: '08:00',
        closes: '17:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Thursday'],
        opens: '07:00',
        closes: '16:00',
      },
    ])
  })

  test('drops an empty hours or sameAs array instead of emitting an empty key', () => {
    const schema = buildLocalBusinessSchema({
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
      openingHours: [],
      sameAs: [],
    })

    expect('openingHoursSpecification' in schema).toBe(false)
    expect('sameAs' in schema).toBe(false)
  })

  test('nests geo coordinates as GeoCoordinates', () => {
    const schema = buildLocalBusinessSchema({
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
      geo: { latitude: 33.759, longitude: -118.132 },
    })

    expect(schema['geo']).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 33.759,
      longitude: -118.132,
    })
  })

  test('never emits a rating, which a business may not mark up about itself', () => {
    const schema = buildLocalBusinessSchema({
      name: 'Bayside Family Dental',
      url: 'https://example.com/',
      address: ADDRESS,
      telephone: '+1-562-438-8802',
    })

    expect('aggregateRating' in schema).toBe(false)
    expect('review' in schema).toBe(false)
  })
})

describe('buildFaqPageSchema', () => {
  test('pairs every question with its accepted answer', () => {
    const schema = buildFaqPageSchema({
      items: [{ question: 'Do you take my insurance?', answer: 'Most major plans.' }],
    })

    expect(schema['@type']).toBe('FAQPage')
    expect(schema['mainEntity']).toEqual([
      {
        '@type': 'Question',
        name: 'Do you take my insurance?',
        acceptedAnswer: { '@type': 'Answer', text: 'Most major plans.' },
      },
    ])
  })

  test('handles an empty list without inventing entries', () => {
    expect(buildFaqPageSchema({ items: [] })['mainEntity']).toEqual([])
  })
})

describe('buildBreadcrumbSchema', () => {
  test('numbers positions from one, in the order given', () => {
    const schema = buildBreadcrumbSchema({
      items: [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Book', url: 'https://example.com/book/' },
      ],
    })

    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
      { '@type': 'ListItem', position: 2, name: 'Book', item: 'https://example.com/book/' },
    ])
  })
})

describe('buildPersonSchema', () => {
  test('emits a Person with only the fields it was given', () => {
    const schema = buildPersonSchema({ name: 'Dr Matthew Listiyo' })

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Dr Matthew Listiyo',
    })
  })

  test('ties the practitioner to the practice they work for', () => {
    const schema = buildPersonSchema({
      name: 'Dr Matthew Listiyo',
      jobTitle: 'DDS',
      worksFor: { name: 'Listiyo Family Dental', url: 'https://example.com' },
    })

    expect(schema.jobTitle).toBe('DDS')
    expect(schema.worksFor).toEqual({
      '@type': 'Organization',
      name: 'Listiyo Family Dental',
      url: 'https://example.com',
    })
  })

  test('wraps a school name in the type schema.org expects', () => {
    const schema = buildPersonSchema({ name: 'Dr Reyes', alumniOf: 'UCLA School of Dentistry' })

    expect(schema.alumniOf).toEqual({
      '@type': 'EducationalOrganization',
      name: 'UCLA School of Dentistry',
    })
  })

  test('omits an empty sameAs rather than emitting a bare array', () => {
    const schema = buildPersonSchema({ name: 'Dr Reyes', sameAs: [] })

    expect(schema).not.toHaveProperty('sameAs')
  })
})

describe('buildServiceSchema', () => {
  test('emits a Service naming its provider', () => {
    const schema = buildServiceSchema({
      name: 'Invisalign',
      description: 'Clear aligners.',
      provider: { name: 'Listiyo Family Dental' },
    })

    expect(schema['@type']).toBe('Service')
    expect(schema.provider).toEqual({
      '@type': 'Organization',
      name: 'Listiyo Family Dental',
    })
  })

  test('never publishes a price, which a healthcare service does not have', () => {
    const schema = buildServiceSchema({
      name: 'Invisalign',
      description: 'Clear aligners.',
      provider: { name: 'Listiyo Family Dental' },
    })

    expect(schema).not.toHaveProperty('offers')
    expect(schema).not.toHaveProperty('price')
  })

  test('carries the optional narrowing fields when given', () => {
    const schema = buildServiceSchema({
      name: 'Invisalign',
      description: 'Clear aligners.',
      url: 'https://example.com/services/invisalign',
      serviceType: 'Cosmetic dentistry',
      areaServed: 'Long Beach, CA',
      provider: { name: 'Listiyo Family Dental' },
    })

    expect(schema.serviceType).toBe('Cosmetic dentistry')
    expect(schema.areaServed).toBe('Long Beach, CA')
    expect(schema.url).toBe('https://example.com/services/invisalign')
  })
})

describe('buildWebPageSchema', () => {
  test('emits a WebPage with only the fields it was given', () => {
    const schema = buildWebPageSchema({ name: 'Invisalign', url: 'https://example.com/invisalign' })

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Invisalign',
      url: 'https://example.com/invisalign',
    })
  })

  test('ties the page to the site entity through isPartOf', () => {
    const schema = buildWebPageSchema({
      name: 'Invisalign',
      url: 'https://example.com/invisalign',
      siteUrl: 'https://example.com',
    })

    expect(schema.isPartOf).toEqual({ '@type': 'WebSite', url: 'https://example.com' })
  })

  test('wraps the lead image as an ImageObject', () => {
    const schema = buildWebPageSchema({
      name: 'Invisalign',
      url: 'https://example.com/invisalign',
      primaryImage: 'https://example.com/hero.jpg',
    })

    expect(schema.primaryImageOfPage).toEqual({
      '@type': 'ImageObject',
      url: 'https://example.com/hero.jpg',
    })
  })

  test('carries the dates a crawler uses to decide whether to refetch', () => {
    const schema = buildWebPageSchema({
      name: 'Invisalign',
      url: 'https://example.com/invisalign',
      datePublished: '2026-01-02',
      dateModified: '2026-08-26',
      inLanguage: 'en-US',
    })

    expect(schema.datePublished).toBe('2026-01-02')
    expect(schema.dateModified).toBe('2026-08-26')
    expect(schema.inLanguage).toBe('en-US')
  })
})
