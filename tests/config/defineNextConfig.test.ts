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
})
