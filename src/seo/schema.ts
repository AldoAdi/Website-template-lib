import type { JsonLdData } from './jsonld'

/** Full day names, as schema.org's `dayOfWeek` requires them. */
export type DayOfWeek =
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface PostalAddressInput {
  readonly street: string
  readonly locality: string
  /** State, province or region -- `'CA'`. */
  readonly region: string
  readonly postalCode: string
  /** ISO 3166-1 alpha-2, e.g. `'US'`. */
  readonly country: string
}

export interface OpeningHoursInput {
  readonly days: readonly DayOfWeek[]
  /** 24-hour `HH:MM`. */
  readonly opens: string
  /** 24-hour `HH:MM`. */
  readonly closes: string
}

export interface LocalBusinessSchemaInput {
  /**
   * A schema.org type more specific than `LocalBusiness` where one fits --
   * `'Dentist'`, `'MedicalClinic'`, `'Restaurant'`. Being specific is worth
   * the effort: the narrower type is what lets a search engine match the
   * entity to an intent rather than to a name.
   */
  readonly type?: string
  readonly name: string
  readonly url: string
  readonly address: PostalAddressInput
  readonly telephone?: string
  /** Absolute URL of a photo of the premises. Relative paths are silently ignored by consumers. */
  readonly image?: string
  /** Free-text band, e.g. `'$$'`. */
  readonly priceRange?: string
  readonly openingHours?: readonly OpeningHoursInput[]
  /** Latitude/longitude of the premises. */
  readonly geo?: { readonly latitude: number; readonly longitude: number }
  /** Profile URLs for the same entity -- Google Business Profile, Yelp, Facebook. */
  readonly sameAs?: readonly string[]
}

/**
 * Builds a schema.org `LocalBusiness` (or a narrower subtype) object.
 *
 * This is the markup that feeds the address, hours and phone number a search
 * engine shows beside a local result, and it is the single highest-leverage
 * structured data a bricks-and-mortar site can emit.
 *
 * **There is deliberately no `aggregateRating` input.** Not out of caution:
 * ratings a business collects about itself, on its own site, are explicitly
 * excluded from review rich results, so marking them up gains nothing and
 * invites a manual action for markup that does not reflect the visible page.
 * Ratings belong on the profiles linked from `sameAs`, where a search engine
 * collects them itself.
 */
export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput): JsonLdData {
  const { type = 'LocalBusiness' } = input

  return {
    '@context': 'https://schema.org',
    '@type': type,
    name: input.name,
    url: input.url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.address.street,
      addressLocality: input.address.locality,
      addressRegion: input.address.region,
      postalCode: input.address.postalCode,
      addressCountry: input.address.country,
    },
    ...(input.telephone === undefined ? {} : { telephone: input.telephone }),
    ...(input.image === undefined ? {} : { image: input.image }),
    ...(input.priceRange === undefined ? {} : { priceRange: input.priceRange }),
    ...(input.geo === undefined
      ? {}
      : {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: input.geo.latitude,
            longitude: input.geo.longitude,
          },
        }),
    ...(input.openingHours === undefined || input.openingHours.length === 0
      ? {}
      : {
          openingHoursSpecification: input.openingHours.map((entry) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: entry.days,
            opens: entry.opens,
            closes: entry.closes,
          })),
        }),
    ...(input.sameAs === undefined || input.sameAs.length === 0 ? {} : { sameAs: input.sameAs }),
  }
}

export interface FaqSchemaItem {
  readonly question: string
  /**
   * The answer as plain text. It must be the same answer the page shows --
   * structured data that contradicts the visible page is the definition of
   * the violation.
   */
  readonly answer: string
}

export interface FaqPageSchemaInput {
  readonly items: readonly FaqSchemaItem[]
}

/**
 * Builds a schema.org `FAQPage` object.
 *
 * Worth calibrating expectations: FAQ rich results were narrowed to
 * well-known authoritative government and health sites, so a private
 * practice should not expect the expandable questions to appear under its
 * listing. The markup still earns its place -- it states plainly what the
 * page answers, which is what a search engine and an answer engine both
 * read -- but it is not the SERP real-estate play it was.
 *
 * Emit at most one of these per page, and keep the `items` array the same
 * one the visible `FAQ` component renders.
 */
export function buildFaqPageSchema(input: FaqPageSchemaInput): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: input.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export interface BreadcrumbItem {
  readonly name: string
  /** Absolute URL of the page this crumb points at. */
  readonly url: string
}

export interface BreadcrumbSchemaInput {
  readonly items: readonly BreadcrumbItem[]
}

/**
 * Builds a schema.org `BreadcrumbList` object, in the order given --
 * shallowest first. `position` is 1-based, which is what makes the list
 * ordered rather than merely a set.
 */
export function buildBreadcrumbSchema(input: BreadcrumbSchemaInput): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
