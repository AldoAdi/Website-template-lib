import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ContactForm } from '../../../src/components/form/ContactForm'
import { findAxeViolations } from '../../axeHelpers'
import { MIN_DWELL_TIME_MS } from '../../../src/security/honeypot'

const ACCESS_KEY = 'test-access-key'
const ENDPOINT = 'https://api.web3forms.com/submit'
const MOUNTED_AT = 1_000_000
const PAST_DWELL_TIME = MOUNTED_AT + MIN_DWELL_TIME_MS + 1_000

// Date.now() is spied rather than faking timers wholesale: fake timers also
// replace setTimeout, which testing-library's async queries (findBy*,
// waitFor) rely on internally, and the two do not mix reliably.
function setNow(value: number): void {
  vi.spyOn(Date, 'now').mockReturnValue(value)
}

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Ada Lovelace' } })
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'ada@example.com' } })
  fireEvent.change(screen.getByLabelText(/^message$/i), {
    target: { value: 'Hello, I would like to know more about your services.' },
  })
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function submitForm(): void {
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
}

beforeEach(() => {
  setNow(MOUNTED_AT)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ContactForm', () => {
  test('invalid submit shows field errors and does not call fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} />)

    submitForm()

    expect(await screen.findByText(/name is required/i)).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('ties an invalid field to its error via aria-describedby and sets aria-invalid', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} />)

    submitForm()
    await screen.findByText(/name is required/i)

    const nameInput = screen.getByLabelText(/^name$/i)
    const describedBy = nameInput.getAttribute('aria-describedby')

    expect(nameInput.getAttribute('aria-invalid')).toBe('true')
    expect(describedBy).toBeTruthy()
    const errorNode = describedBy ? document.getElementById(describedBy) : null
    expect(errorNode).not.toBeNull()
    expect(errorNode?.textContent).toMatch(/name is required/i)
  })

  test('a valid submission calls fetch once, to the configured endpoint, with the access key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} endpoint={ENDPOINT} />)

    fillValidForm()
    setNow(PAST_DWELL_TIME)
    submitForm()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const call = fetchMock.mock.calls[0]
    if (!call) throw new Error('expected fetch to have been called')
    const [calledUrl, calledInit] = call as [string, RequestInit]

    expect(calledUrl).toBe(ENDPOINT)
    const body = JSON.parse(calledInit.body as string) as Record<string, unknown>
    expect(body.access_key).toBe(ACCESS_KEY)
    expect(body.name).toBe('Ada Lovelace')
    expect(body.email).toBe('ada@example.com')

    expect(await screen.findByText(/thanks/i)).toBeDefined()
  })

  test('a filled honeypot silently reports success and calls fetch zero times', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} />)

    fillValidForm()
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'spambot' } })
    setNow(PAST_DWELL_TIME)
    submitForm()

    expect(await screen.findByText(/thanks/i)).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('submitting faster than the minimum dwell time silently reports success', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} />)

    fillValidForm()
    // Still MOUNTED_AT (or barely later) -- well under MIN_DWELL_TIME_MS.
    setNow(MOUNTED_AT + 10)
    submitForm()

    expect(await screen.findByText(/thanks/i)).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('a rejected fetch shows an error state, does not throw, and keeps typed values', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} />)

    fillValidForm()
    setNow(PAST_DWELL_TIME)
    submitForm()

    expect(await screen.findByText(/something went wrong/i)).toBeDefined()
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Ada Lovelace')
    expect((screen.getByLabelText(/^email$/i) as HTMLInputElement).value).toBe('ada@example.com')
    expect((screen.getByLabelText(/^message$/i) as HTMLTextAreaElement).value).toBe(
      'Hello, I would like to know more about your services.',
    )
  })

  test('disables the submit control while submitting', async () => {
    let resolveFetch: (value: Response) => void = () => {}
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<ContactForm accessKey={ACCESS_KEY} />)

    fillValidForm()
    setNow(PAST_DWELL_TIME)
    submitForm()

    await waitFor(() =>
      expect((screen.getByRole('button', { name: /sending/i }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    )

    resolveFetch(jsonResponse({ success: true }))

    await waitFor(() =>
      expect((screen.getByRole('button', { name: /send/i }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
  })

  test('has no axe violations in its default state', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<ContactForm accessKey={ACCESS_KEY} />)

    const violations = await findAxeViolations(container)

    expect(violations).toEqual([])
  })
})
