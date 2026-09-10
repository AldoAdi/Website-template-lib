import type { BookingEvent } from '../types'

/**
 * Where funnel events are persisted.
 *
 * An interface rather than an implementation, deliberately. The library
 * takes no runtime dependencies (SPEC.md: every shared package is a peer),
 * so shipping a Postgres driver here would be the first one -- and it would
 * bind every consuming site to one vendor's client. The adapter is ~15
 * lines and belongs in the site that owns the database.
 */
export interface BookingStore {
  /** Persists one event. May reject; `createIngestHandler` handles the failure. */
  append(event: BookingEvent): Promise<void>
}

export interface MemoryBookingStore extends BookingStore {
  readonly events: readonly BookingEvent[]
  clear(): void
}

/** In-memory store for tests and local development. Loses everything on restart. */
export function createMemoryBookingStore(): MemoryBookingStore {
  let events: readonly BookingEvent[] = []

  return {
    append(event: BookingEvent): Promise<void> {
      events = [...events, event]
      return Promise.resolve()
    },
    get events(): readonly BookingEvent[] {
      return events
    },
    clear(): void {
      events = []
    },
  }
}
