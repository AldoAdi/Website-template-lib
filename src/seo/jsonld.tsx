import type { ReactElement } from 'react'

export type JsonLdData = Readonly<Record<string, unknown>>

export interface OrganizationSchemaInput {
  readonly name: string
  readonly url: string
  readonly logoUrl?: string
  /** Other profile URLs for the same entity (social profiles, Wikipedia, …). */
  readonly sameAs?: readonly string[]
}

export interface WebSiteSchemaInput {
  readonly name: string
  readonly url: string
  readonly description?: string
}

/** Builds a schema.org `Organization` JSON-LD object. Pure — pass the result to `<JsonLd>`. */
export function buildOrganizationSchema(input: OrganizationSchemaInput): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    ...(input.logoUrl === undefined ? {} : { logo: input.logoUrl }),
    ...(input.sameAs === undefined || input.sameAs.length === 0 ? {} : { sameAs: input.sameAs }),
  }
}

/** Builds a schema.org `WebSite` JSON-LD object. Pure — pass the result to `<JsonLd>`. */
export function buildWebSiteSchema(input: WebSiteSchemaInput): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
    ...(input.description === undefined ? {} : { description: input.description }),
  }
}

/**
 * Serializes structured data for embedding inside a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` never emits a bare `<`, so escaping it here is enough to
 * guarantee the payload cannot contain a literal `</script>` or `<!--`
 * sequence — both of which would otherwise let attacker-controlled data
 * (e.g. a CMS-sourced `name` field) close the surrounding script element
 * early and inject markup. This is the sanitizer SPEC.md requires before
 * any `dangerouslySetInnerHTML` use.
 */
export function serializeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export interface JsonLdProps {
  /** One structured-data object, or several — each is rendered as its own `<script>` tag. */
  readonly data: JsonLdData | readonly JsonLdData[]
}

/**
 * Renders one or more JSON-LD `<script type="application/ld+json">` tags.
 * A server component — it needs no client JS, so it renders to plain
 * markup under `output: 'export'` (SPEC.md Deploy Targets).
 *
 * Uses `dangerouslySetInnerHTML` because JSON-LD has no other way into a
 * `<script>` tag; `serializeJsonLd` is the explicit sanitizer SPEC.md
 * requires alongside it.
 */
export function JsonLd({ data }: JsonLdProps): ReactElement {
  const items = Array.isArray(data) ? data : [data]

  return (
    <>
      {items.map((item, index) => {
        const type = item['@type']
        const key = typeof type === 'string' ? `${type}-${index}` : index

        return (
          <script
            key={key}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
          />
        )
      })}
    </>
  )
}
