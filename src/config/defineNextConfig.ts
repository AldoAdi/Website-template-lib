import type { NextConfig } from 'next'
import { getHttpSecurityHeaders } from '../security/headers'

export type DeployTarget = 'vercel' | 'github-pages'

export interface DefineNextConfigOptions {
  readonly target: DeployTarget
  /** GitHub Pages project-page repo name, e.g. "my-site" -> basePath "/my-site".
   *  Omit for a custom domain project page (root-served) — no basePath is emitted. */
  readonly repoName?: string
}

const GITHUB_PAGES_TRAILING_SLASH = true

/**
 * Builds the next.config.ts export for one of the two supported deploy
 * targets. Vercel gets Next's normal server defaults (SSR/ISR, optimized
 * images, root paths). GitHub Pages gets a fully static export with the
 * subpath wiring a project page needs.
 */
export function defineNextConfig(options: DefineNextConfigOptions): NextConfig {
  if (options.target === 'github-pages') {
    return buildGithubPagesConfig(options.repoName)
  }

  return buildVercelConfig()
}

const ALL_ROUTES_SOURCE = '/:path*'

/**
 * Vercel is a Node server (SSR/ISR), so it can actually send HTTP response
 * headers -- unlike the GitHub Pages static export, which has no server to
 * attach them to and falls back to a much weaker `<meta http-equiv>` CSP
 * (see `src/security/headers.ts`). Wiring `headers()` here is therefore
 * deliberately Vercel-only.
 */
function buildVercelConfig(): NextConfig {
  return {
    headers: () =>
      Promise.resolve([
        {
          source: ALL_ROUTES_SOURCE,
          headers: getHttpSecurityHeaders().map(({ key, value }) => ({ key, value })),
        },
      ]),
  }
}

function buildGithubPagesConfig(repoName: string | undefined): NextConfig {
  const basePath = repoName === undefined ? undefined : `/${repoName}`

  return {
    output: 'export',
    trailingSlash: GITHUB_PAGES_TRAILING_SLASH,
    images: { unoptimized: true },
    ...(basePath === undefined ? {} : { basePath, assetPrefix: basePath }),
  }
}
