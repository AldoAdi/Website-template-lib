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
