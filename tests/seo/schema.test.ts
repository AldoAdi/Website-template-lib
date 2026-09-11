import { describe, expect, test } from 'vitest'
import {
  buildBreadcrumbSchema,
  buildFaqPageSchema,
  buildLocalBusinessSchema,
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
