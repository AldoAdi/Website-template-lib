import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useFormPost } from '../../../src/components/form/useFormPost'

const ENDPOINT = 'https://api.example.test/submit'

function stubFetch(response: Partial<Response> | Error): ReturnType<typeof vi.fn> {
  const mock =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', mock)
  return mock
}

/** A Response stand-in: only `ok` and `json` are read by the hook. */
function jsonResponse(ok: boolean, body: unknown): Partial<Response> {
  return { ok, json: async () => body } as Partial<Response>
}

/** A 200 whose body is not JSON at all -- `json()` rejects. */
function nonJsonResponse(): Partial<Response> {
  return {
    ok: true,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON')
    },
  } as Partial<Response>
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useFormPost', () => {
  test('a 2xx with a success body resolves true and lands on success', async () => {
    stubFetch(jsonResponse(true, { success: true }))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    let resolved: boolean | undefined
    await act(async () => {
      resolved = await result.current.submit({ any: 'payload' })
    })

    expect(resolved).toBe(true)
    expect(result.current.status).toBe('success')
    expect(result.current.errorMessage).toBeNull()
  })

  // The realistic wrong-access-key case: Web3Forms answers HTTP 200 and
  // reports the rejection in the body. Treating `ok` as success would show
  // the visitor a success message for a message that was never delivered.
  test('a 200 carrying { success: false } is an error, not a success', async () => {
    stubFetch(jsonResponse(true, { success: false, message: 'Invalid access key' }))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    let resolved: boolean | undefined
    await act(async () => {
      resolved = await result.current.submit({ any: 'payload' })
    })

    expect(resolved).toBe(false)
    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).not.toBeNull()
  })

  test('a non-2xx response is an error', async () => {
    stubFetch(jsonResponse(false, { success: false }))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    let resolved: boolean | undefined
    await act(async () => {
      resolved = await result.current.submit({ any: 'payload' })
    })

    expect(resolved).toBe(false)
    expect(result.current.status).toBe('error')
  })

  test('a rejected fetch is caught, never rethrown', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    let resolved: boolean | undefined
    await act(async () => {
      resolved = await result.current.submit({ any: 'payload' })
    })

    expect(resolved).toBe(false)
    expect(result.current.status).toBe('error')
  })

  // `response.ok` already established the request was accepted; a body that
  // is not JSON only means the backend does not report a success flag.
  test('a 2xx whose body is not JSON counts as success', async () => {
    stubFetch(nonJsonResponse())
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    let resolved: boolean | undefined
    await act(async () => {
      resolved = await result.current.submit({ any: 'payload' })
    })

    expect(resolved).toBe(true)
    expect(result.current.status).toBe('success')
  })

  test('a 2xx whose body omits a success field counts as success', async () => {
    stubFetch(jsonResponse(true, { message: 'queued' }))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    await act(async () => {
      await result.current.submit({ any: 'payload' })
    })

    expect(result.current.status).toBe('success')
  })

  test('reset returns the hook to idle and clears the error', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    await act(async () => {
      await result.current.submit({ any: 'payload' })
    })
    expect(result.current.status).toBe('error')

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBeNull()
  })

  test('posts JSON to the configured endpoint', async () => {
    const fetchMock = stubFetch(jsonResponse(true, { success: true }))
    const { result } = renderHook(() => useFormPost(ENDPOINT))

    await act(async () => {
      await result.current.submit({ access_key: 'public-key', name: 'Ada' })
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ access_key: 'public-key', name: 'Ada' })
  })
})
