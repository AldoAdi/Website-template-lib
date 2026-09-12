import { describe, expect, test } from 'vitest'
import {
  getHttpSecurityHeaders,
  getMetaSecurityTags,
  securityHeaders,
} from '../../src/security/headers'

function findHttpHeader(
  name: string,
): { readonly key: string; readonly value: string } | undefined {
  return getHttpSecurityHeaders().find((header) => header.key === name)
}

describe('getHttpSecurityHeaders', () => {
  test('includes a Content-Security-Policy header', () => {
    expect(findHttpHeader('Content-Security-Policy')).toBeDefined()
  })

  test('includes the expected header names and values', () => {
    expect(findHttpHeader('X-Content-Type-Options')?.value).toBe('nosniff')
    expect(findHttpHeader('X-Frame-Options')?.value).toBe('DENY')
    expect(findHttpHeader('Referrer-Policy')?.value).toBe('strict-origin-when-cross-origin')
    expect(findHttpHeader('Permissions-Policy')?.value).toContain('geolocation=()')
    expect(findHttpHeader('Strict-Transport-Security')?.value).toMatch(
      /^max-age=\d+; includeSubDomains; preload$/,
    )
  })

  test('CSP includes frame-ancestors none', () => {
    const csp = findHttpHeader('Content-Security-Policy')?.value ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
  })

  test('CSP contains no unsafe-eval', () => {
    const csp = findHttpHeader('Content-Security-Policy')?.value ?? ''
    expect(csp).not.toContain('unsafe-eval')
  })

  test('CSP allows the GA4 script and collection origins in the right directives', () => {
    const csp = findHttpHeader('Content-Security-Policy')?.value ?? ''
    const scriptSrc = csp.split(';').find((directive) => directive.trim().startsWith('script-src'))
    const connectSrc = csp
      .split(';')
      .find((directive) => directive.trim().startsWith('connect-src'))

    expect(scriptSrc).toContain('https://www.googletagmanager.com')
    expect(connectSrc).toContain('https://www.google-analytics.com')
    expect(connectSrc).toContain('https://*.google-analytics.com')
  })

  test('CSP allows the Web3Forms submit endpoint in connect-src', () => {
    const csp = findHttpHeader('Content-Security-Policy')?.value ?? ''
    const connectSrc = csp
      .split(';')
      .find((directive) => directive.trim().startsWith('connect-src'))

    expect(connectSrc).toContain('https://api.web3forms.com')
  })

  test('CSP allows inline scripts, documented as required by next-themes/Next/GA inline scripts', () => {
    const csp = findHttpHeader('Content-Security-Policy')?.value ?? ''
    const scriptSrc = csp.split(';').find((directive) => directive.trim().startsWith('script-src'))

    expect(scriptSrc).toContain("'unsafe-inline'")
  })
})

describe('getMetaSecurityTags', () => {
  test('contains the CSP as a http-equiv meta tag', () => {
    const tags = getMetaSecurityTags()
    const csp = tags.find((tag) => tag.httpEquiv === 'Content-Security-Policy')

    expect(csp).toBeDefined()
    expect(csp?.content).toContain("default-src 'self'")
  })

  test('CSP still allows GA4 and Web3Forms and has no unsafe-eval', () => {
    const tags = getMetaSecurityTags()
    const csp = tags.find((tag) => tag.httpEquiv === 'Content-Security-Policy')?.content ?? ''

    expect(csp).toContain('https://www.googletagmanager.com')
    expect(csp).toContain('https://www.google-analytics.com')
    expect(csp).toContain('https://api.web3forms.com')
    expect(csp).not.toContain('unsafe-eval')
  })

  test('omits frame-ancestors -- ignored by browsers when delivered via meta', () => {
    const tags = getMetaSecurityTags()
    const csp = tags.find((tag) => tag.httpEquiv === 'Content-Security-Policy')?.content ?? ''

    expect(csp).not.toContain('frame-ancestors')
  })

  test('omits Strict-Transport-Security -- has no meta form at all', () => {
    const tags = getMetaSecurityTags()
    const hsts = tags.find((tag) => tag.httpEquiv === 'Strict-Transport-Security')

    expect(hsts).toBeUndefined()
  })

  test('omits X-Frame-Options -- browsers do not honor it via meta', () => {
    const tags = getMetaSecurityTags()
    const xfo = tags.find((tag) => tag.httpEquiv === 'X-Frame-Options')

    expect(xfo).toBeUndefined()
  })
})

describe('securityHeaders', () => {
  test('returns both shapes together', () => {
    const result = securityHeaders()

    expect(result.http).toEqual(getHttpSecurityHeaders())
    expect(result.meta).toEqual(getMetaSecurityTags())
  })

  test('the HTTP shape carries frame-ancestors and HSTS that the meta shape lacks', () => {
    const result = securityHeaders()
    const httpCsp = result.http.find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
    const metaCsp =
      result.meta.find((t) => t.httpEquiv === 'Content-Security-Policy')?.content ?? ''

    expect(httpCsp).toContain('frame-ancestors')
    expect(metaCsp).not.toContain('frame-ancestors')
    expect(result.http.some((h) => h.key === 'Strict-Transport-Security')).toBe(true)
    expect(result.meta.some((t) => t.httpEquiv === 'Strict-Transport-Security')).toBe(false)
  })
})

describe('style-src', () => {
  // Regression guard. `style-src 'self'` looks correct against the emitted
  // HTML -- there are no <style> tags and no style attributes in it -- but
  // next-themes assigns documentElement.style.colorScheme at runtime, and a
  // bare 'self' blocks that with "Applying inline style violates the
  // following Content Security Policy directive". Only a real browser load
  // surfaces it, so this test pins the exception in place.
  test("keeps 'unsafe-inline', which next-themes needs to set colorScheme", () => {
    const csp = getHttpSecurityHeaders().find((h) => h.key === 'Content-Security-Policy')?.value
    const styleSrc = csp?.split('; ').find((d) => d.startsWith('style-src'))

    expect(styleSrc).toBe("style-src 'self' 'unsafe-inline'")
  })

  test('the meta shape keeps it too -- GitHub Pages runs the same script', () => {
    const csp = getMetaSecurityTags()[0]?.content
    const styleSrc = csp?.split('; ').find((d) => d.startsWith('style-src'))

    expect(styleSrc).toBe("style-src 'self' 'unsafe-inline'")
  })
})

describe('connect-src allowlist extension', () => {
  function connectSrcOf(csp: string): string {
    return csp.split('; ').find((directive) => directive.startsWith('connect-src ')) ?? ''
  }

  test("defaults to the library's own origins only", () => {
    const csp = getHttpSecurityHeaders().find((h) => h.key === 'Content-Security-Policy')?.value

    expect(connectSrcOf(csp ?? '')).toBe(
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com " +
        'https://*.analytics.google.com https://www.googletagmanager.com ' +
        'https://www.google.com https://stats.g.doubleclick.net https://api.web3forms.com',
    )
  })

  test('appends a caller-supplied ingest origin', () => {
    const csp = getHttpSecurityHeaders({
      connectSrc: ['https://ingest.example'],
    }).find((h) => h.key === 'Content-Security-Policy')?.value

    expect(connectSrcOf(csp ?? '')).toContain('https://ingest.example')
  })

  test('extends the meta shape the same way, so a static site is not left blocked', () => {
    const [tag] = getMetaSecurityTags({ connectSrc: ['https://ingest.example'] })

    expect(tag?.content).toContain('https://ingest.example')
  })

  test('drops an origin containing whitespace or a semicolon, which would forge a directive', () => {
    const csp = getHttpSecurityHeaders({
      connectSrc: ['https://ok.example', "https://evil.example; script-src 'unsafe-eval'", '  '],
    }).find((h) => h.key === 'Content-Security-Policy')?.value

    expect(csp).toContain('https://ok.example')
    expect(csp).not.toContain('unsafe-eval')
  })

  test('securityHeaders threads the option into both shapes', () => {
    const { http, meta } = securityHeaders({ connectSrc: ['https://ingest.example'] })

    expect(http.find((h) => h.key === 'Content-Security-Policy')?.value).toContain(
      'https://ingest.example',
    )
    expect(meta[0]?.content).toContain('https://ingest.example')
  })
})

describe('script-src and img-src allowlist extensions', () => {
  function directiveOf(csp: string, name: string): string {
    return csp.split('; ').find((directive) => directive.startsWith(`${name} `)) ?? ''
  }

  function httpCsp(options?: Parameters<typeof getHttpSecurityHeaders>[0]): string {
    return (
      getHttpSecurityHeaders(options).find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
    )
  }

  test('GTM can reach its container: the origin is in both script-src and connect-src', () => {
    const csp = httpCsp()

    expect(directiveOf(csp, 'script-src')).toContain('https://www.googletagmanager.com')
    expect(directiveOf(csp, 'connect-src')).toContain('https://www.googletagmanager.com')
  })

  test('appends caller-supplied script origins, which is what GTM tags need', () => {
    const csp = httpCsp({ scriptSrc: ['https://connect.facebook.net'] })

    expect(directiveOf(csp, 'script-src')).toContain('https://connect.facebook.net')
  })

  test('appends caller-supplied image origins, which is what conversion pixels need', () => {
    const csp = httpCsp({ imgSrc: ['https://www.google.com'] })

    expect(directiveOf(csp, 'img-src')).toContain('https://www.google.com')
  })

  test('img-src keeps its defaults when extended', () => {
    const imgSrc = directiveOf(httpCsp({ imgSrc: ['https://www.google.com'] }), 'img-src')

    expect(imgSrc).toContain("'self'")
    expect(imgSrc).toContain('data:')
  })

  test('rejects a forged directive in any of the three lists', () => {
    const csp = httpCsp({
      scriptSrc: ["https://evil.example; object-src 'self'"],
      imgSrc: ['https://evil.example; base-uri *'],
    })

    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).not.toContain('base-uri *')
  })
})

describe('the library allowlists its own integrations everywhere they reach', () => {
  // The invariant that was missing. googletagmanager.com was allowlisted in
  // script-src and connect-src but not img-src, so GTM's /td diagnostics ping
  // was blocked on every site built on this library -- found by a console
  // error on a live deploy, not by these tests.
  const GTM = 'https://www.googletagmanager.com'
  const GA = 'https://www.google-analytics.com'
  const GA_WILDCARD = 'https://*.google-analytics.com'

  function cspOf(): string {
    return getHttpSecurityHeaders().find((h) => h.key === 'Content-Security-Policy')?.value ?? ''
  }

  function directive(csp: string, name: string): string {
    return csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''
  }

  test('googletagmanager is present in every directive that can fetch it', () => {
    const csp = cspOf()

    for (const name of ['script-src', 'connect-src', 'img-src']) {
      expect(directive(csp, name)).toContain(GTM)
    }
  })

  test('google-analytics is reachable by beacon and by image fallback', () => {
    const csp = cspOf()

    for (const name of ['connect-src', 'img-src']) {
      expect(directive(csp, name)).toContain(GA)
      expect(directive(csp, name)).toContain(GA_WILDCARD)
    }
  })

  test('every origin GA4 collects to is in connect-src', () => {
    // The omission that cost a day: gtag loaded with the right property, posted
    // to https://www.google.com/g/collect, and the browser refused. GA4 reports
    // nothing and Tag Assistant still says the tag fired, so the only evidence
    // is a console line nobody thinks to look at.
    const connectSrc = directive(cspOf(), 'connect-src')

    for (const origin of [
      GA,
      GA_WILDCARD,
      'https://*.analytics.google.com',
      'https://www.google.com',
      'https://stats.g.doubleclick.net',
    ]) {
      expect(connectSrc).toContain(origin)
    }
  })

  test('the ads collection origins also have their pixel form allowed', () => {
    const imgSrc = directive(cspOf(), 'img-src')

    expect(imgSrc).toContain('https://www.google.com')
    expect(imgSrc).toContain('https://stats.g.doubleclick.net')
  })

  test('the meta CSP carries the same img-src allowlist as the HTTP one', () => {
    const meta = getMetaSecurityTags().find((tag) => tag.httpEquiv === 'Content-Security-Policy')

    expect(meta).toBeDefined()
    expect(directive(meta?.content ?? '', 'img-src')).toContain(GTM)
  })
})
