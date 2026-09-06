// Reached via the "./seo" subpath.
export { buildMetadata, buildCanonicalUrl } from './metadata'
export type { SiteMetadataConfig, PageMetadataInput, SeoImage } from './metadata'
export { JsonLd, buildOrganizationSchema, buildWebSiteSchema, serializeJsonLd } from './jsonld'
export type { JsonLdProps, JsonLdData, OrganizationSchemaInput, WebSiteSchemaInput } from './jsonld'
export { buildSitemap, buildRobots } from './sitemap'
export type { SitemapRouteInput, BuildSitemapInput, BuildRobotsInput } from './sitemap'
