import { z } from 'zod'
import { MAX_ATTRIBUTION_VALUE_LENGTH } from '../attribution'
import type { BookingEvent } from '../types'
import type { BookingStore } from './store'

/**
 * The optional server half: a Next route handler that accepts funnel
 * events from `createHttpSink` and writes them to a store the site owns.
 *
 * Nothing in the client half needs this. It exists so that "we want our own
 * database" is a later decision with a small diff, rather than an
 * architecture chosen up front.
 *
 * This file imports nothing from Next and touches no Node built-in -- it
 * takes a `Request` and returns a `Response`, which is what an App Router
 * route handler already is. That keeps it testable with plain fetch
 * primitives and keeps the library free of a server dependency.
 */

const ID_MAX_LENGTH = 64
const LOCATION_MAX_LENGTH = 64

/** Roughly a page-load's worth of events, well under any body-size limit. */
export const MAX_BODY_BYTES = 8 * 1024

/**
 * Keys that must never appear in a funnel event.
 *
 * The client never sends them, so this is not input validation so much as a
 * standing guarantee: an anonymous funnel log stays anonymous, which is
 * what keeps a US healthcare site's analytics out of HIPAA scope. If a
 * future change starts collecting a patient's name, this rejects it loudly
 * instead of quietly writing PHI to a table nobody reviewed.
 */
const FORBIDDEN_KEYS: readonly string[] = [
  'name',
  'firstName',
  'lastName',
  'email',
  'phone',
  'tel',
  'dob',
  'dateOfBirth',
  'address',
  'insurance',
  'reason',
  'notes',
  'message',
]

const attributionSchema = z
  .object({
    utmSource: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    utmMedium: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    utmCampaign: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    utmTerm: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    utmContent: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    gclid: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    wbraid: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    gbraid: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    fbclid: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    msclkid: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    referrer: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    landingPath: z.string().max(MAX_ATTRIBUTION_VALUE_LENGTH).optional(),
    capturedAt: z.number().int().nonnegative().optional(),
  })
  // Unknown keys are dropped rather than rejected: a newer site sending a
  // click id this version has not heard of should still have its event
  // stored, minus the field.
  .strip()

const bookingEventSchema = z.object({
  step: z.enum(['cta_click', 'booking_view', 'booking_handoff', 'booking_confirmed']),
  visitorId: z.string().min(1).max(ID_MAX_LENGTH),
  sessionId: z.string().min(1).max(ID_MAX_LENGTH),
  at: z.number().int().nonnegative(),
  firstTouch: attributionSchema,
  lastTouch: attributionSchema,
  location: z.string().max(LOCATION_MAX_LENGTH).optional(),
})

/** Walks the parsed body for forbidden keys at any depth before it reaches the schema. */
export function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey)

  if (value === null || typeof value !== 'object') return false

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) return true
    if (containsForbiddenKey(nested)) return true
  }

  return false
}

export interface IngestHandlerOptions {
  /**
   * Called when a request is rejected or a write fails. Defaults to
   * `console.error`. The handler never surfaces the reason to the caller --
   * a public endpoint should not narrate its own validation rules.
   */
  readonly onError?: (reason: string, error?: unknown) => void
}

/**
 * Builds the route handler.
 *
 * Every rejection returns 204, not 4xx. The caller is `sendBeacon`, which
 * cannot read the response and will not retry, so a status code buys
 * nothing operationally -- while a 400 would tell anyone probing the
 * endpoint exactly which payloads are interesting. Real failures go to
 * `onError`, where they can be seen.
 *
 * Mount it in a consuming app as:
 *
 * ```ts
 * // app/api/booking-event/route.ts   (Vercel or any Node target -- NOT output: 'export')
 * import { createIngestHandler } from '@aldoadi/website-template/booking/server'
 * export const POST = createIngestHandler(store)
 * ```
 */
export function createIngestHandler(
  store: BookingStore,
  options: IngestHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const onError =
    options.onError ??
    ((reason: string, error?: unknown) => {
      console.error(`[booking] ingest rejected: ${reason}`, error ?? '')
    })

  return async function handleIngest(request: Request): Promise<Response> {
    const accepted = new Response(null, { status: 204 })

    let raw: string
    try {
      raw = await request.text()
    } catch (error) {
      onError('unreadable body', error)
      return accepted
    }

    // Measured in bytes, not characters: a multi-byte payload can be well
    // over the limit while `raw.length` still looks small.
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      onError('body too large')
      return accepted
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      onError('malformed json', error)
      return accepted
    }

    if (containsForbiddenKey(parsed)) {
      onError('payload carried a forbidden (PII-shaped) key')
      return accepted
    }

    const result = bookingEventSchema.safeParse(parsed)
    if (!result.success) {
      onError('schema validation failed', result.error)
      return accepted
    }

    try {
      await store.append(result.data as BookingEvent)
    } catch (error) {
      onError('store write failed', error)
    }

    return accepted
  }
}
