import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getSessionId,
  getVisitorId,
  readCookie,
  SESSION_COOKIE,
  VISITOR_COOKIE,
  VISITOR_TTL_SECONDS,
  writeCookie,
} from '../../src/booking/ids'

function clearCookies(): void {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  clearCookies()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cookie helpers', () => {
  test('a written cookie reads back', () => {
    writeCookie('bk_test', 'value-1', 60)

    expect(readCookie('bk_test')).toBe('value-1')
  })

  test('values are url-encoded on the way out and decoded on the way back', () => {
    writeCookie('bk_test', 'a b;c', 60)

    expect(readCookie('bk_test')).toBe('a b;c')
  })

  test('an absent cookie reads as undefined', () => {
    expect(readCookie('bk_missing')).toBeUndefined()
  })

  test('a cookie whose name is a prefix of another is not confused for it', () => {
    writeCookie('bk_vid_extra', 'wrong', 60)
    writeCookie('bk_vid', 'right', 60)

    expect(readCookie('bk_vid')).toBe('right')
  })
})

describe('getVisitorId', () => {
  test('mints and persists an id on first call', () => {
    const id = getVisitorId()

    expect(id).not.toBe('')
    expect(readCookie(VISITOR_COOKIE)).toBe(id)
  })

  test('returns the same id on a second call', () => {
    expect(getVisitorId()).toBe(getVisitorId())
  })

  test('stays inside the 400-day ceiling browsers impose on script-set cookies', () => {
    expect(VISITOR_TTL_SECONDS).toBe(400 * 24 * 60 * 60)
  })

  test('falls back to a non-crypto id where randomUUID is unavailable', () => {
    vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue(undefined as unknown as Crypto)

    expect(getVisitorId()).not.toBe('')
  })
})

describe('getSessionId', () => {
  test('mints and persists an id on first call', () => {
    const id = getSessionId()

    expect(readCookie(SESSION_COOKIE)).toBe(id)
  })

  test('reuses the id while the session cookie is alive', () => {
    expect(getSessionId()).toBe(getSessionId())
  })

  test('mints a fresh id once the session cookie is gone', () => {
    const first = getSessionId()
    clearCookies()

    expect(getSessionId()).not.toBe(first)
  })

  test('the visitor id survives a session rollover, which is what makes it a visitor id', () => {
    const visitor = getVisitorId()
    const session = getSessionId()

    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0`

    expect(getVisitorId()).toBe(visitor)
    expect(getSessionId()).not.toBe(session)
  })
})
