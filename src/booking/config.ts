import { createGaSink, createHttpSink, type BookingSink } from './sink'

/**
 * Module-level sink configuration.
 *
 * Sinks cannot be passed as props. They are objects carrying functions, and
 * a Next server component may not hand a function to a client component --
 * the build fails with "Functions cannot be passed directly to Client
 * Components". Since every booking CTA lives in a page that is a server
 * component by default, prop-passing was never viable.
 *
 * Resolving them here instead is also the better interface: a site with
 * nothing special to say wires nothing at all, and the GA sink -- the one
 * that needs no infrastructure -- works out of the box.
 */

let configured: readonly BookingSink[] | null = null
let resolved: readonly BookingSink[] | null = null

/**
 * Reads the default sink set from the environment.
 *
 * GA4 is always present; it needs no infrastructure and inherits the
 * library's consent gate. The first-party ingest sink appears only when a
 * site has actually stood up an endpoint for it, so declaring the env var is
 * the entire opt-in to owning the data.
 */
function defaultSinks(): readonly BookingSink[] {
  const ingestUrl = process.env.NEXT_PUBLIC_BOOKING_INGEST_URL

  if (ingestUrl === undefined || ingestUrl === '') return [createGaSink()]

  return [createGaSink(), createHttpSink(ingestUrl)]
}

/**
 * Overrides the sinks for the whole app.
 *
 * Must be called from client code -- a module-scope call in a server
 * component would configure the server's module instance, not the browser's.
 * The usual place is a `'use client'` module imported by the root layout.
 * Most sites never need this.
 */
export function configureBookingSinks(sinks: readonly BookingSink[]): void {
  configured = sinks
  resolved = null
}

/**
 * The sinks in effect. Memoized so the array identity is stable across
 * renders -- `BookingRedirect` has it in an effect dependency list, and a
 * fresh array each render would re-fire the handoff.
 */
export function getBookingSinks(): readonly BookingSink[] {
  if (configured !== null) return configured

  resolved ??= defaultSinks()
  return resolved
}

/** Test seam: drops both the override and the memoized default. */
export function resetBookingSinks(): void {
  configured = null
  resolved = null
}
