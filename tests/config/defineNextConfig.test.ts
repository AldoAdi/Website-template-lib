import { describe, expect, test } from 'vitest'
import { defineNextConfig } from '../../src/config/defineNextConfig'

describe('defineNextConfig', () => {
  test('returns Next server defaults for the vercel target', () => {
    const config = defineNextConfig({ target: 'vercel' })

    expect(config.output).toBeUndefined()
    expect(config.basePath).toBeUndefined()
    expect(config.assetPrefix).toBeUndefined()
    expect(config.images).toBeUndefined()
    expect(config.trailingSlash).toBeUndefined()
  })

  test('returns a static export with basePath and assetPrefix when repoName is given', () => {
    const config = defineNextConfig({ target: 'github-pages', repoName: 'my-site' })

    expect(config.output).toBe('export')
    expect(config.basePath).toBe('/my-site')
    expect(config.assetPrefix).toBe('/my-site')
    expect(config.images?.unoptimized).toBe(true)
    expect(config.trailingSlash).toBe(true)
  })

  test('omits basePath and assetPrefix when repoName is not given', () => {
    const config = defineNextConfig({ target: 'github-pages' })

    expect(config.output).toBe('export')
    expect(config.basePath).toBeUndefined()
    expect(config.assetPrefix).toBeUndefined()
    expect(config.images?.unoptimized).toBe(true)
    expect(config.trailingSlash).toBe(true)
  })

  test('carries real HTTP security headers for the vercel target', async () => {
    const config = defineNextConfig({ target: 'vercel' })

    expect(config.headers).toBeTypeOf('function')
    const headerEntries = await config.headers?.()
    const cspHeader = headerEntries
      ?.flatMap((entry) => entry.headers)
      .find((header) => header.key === 'Content-Security-Policy')

    expect(headerEntries?.[0]?.source).toBe('/:path*')
    expect(cspHeader?.value).toContain("default-src 'self'")
  })

  test('does not carry an HTTP headers() function for the github-pages target', () => {
    // A static export has no server to run headers() against -- Next
    // would silently ignore it, so `defineNextConfig` must not emit one.
    const config = defineNextConfig({ target: 'github-pages', repoName: 'my-site' })

    expect(config.headers).toBeUndefined()
  })
})
