// Reached via the "./booking" subpath. Everything here is client-safe and
// works under `output: 'export'` -- no route handler, no server, nothing
// that would break the static floor in SPEC.md.
//
// The ingest handler for a site that wants its own database lives behind a
// separate "./booking/server" subpath, so a static build can never pull it
// in by importing this barrel.
export type { Attribution, BookingEvent, BookingStep, StoredAttribution } from './types'

export {
  getAttribution,
  isEmptyAttribution,
  parseAttribution,
  recordAttribution,
  MAX_ATTRIBUTION_VALUE_LENGTH,
} from './attribution'
export type { ParseAttributionInput } from './attribution'

export {
  getSessionId,
  getVisitorId,
  readCookie,
  writeCookie,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  VISITOR_COOKIE,
  VISITOR_TTL_SECONDS,
} from './ids'

export {
  createGaSink,
  createHttpSink,
  createMemorySink,
  emitBookingEvent,
  toFlatProps,
} from './sink'
export type { BookingSink, HttpSinkOptions, MemorySink } from './sink'

export { configureBookingSinks, getBookingSinks, resetBookingSinks } from './config'

export { buildBookingUrl, SESSION_PARAM, VISITOR_PARAM } from './buildBookingUrl'
export type { BuildBookingUrlInput } from './buildBookingUrl'

export { recordBookingStep } from './recordStep'
export type { RecordStepOptions } from './recordStep'

export { BookingLink } from './BookingLink'
export type { BookingLinkProps } from './BookingLink'

export { BookingRedirect, DEFAULT_REDIRECT_DELAY_MS } from './BookingRedirect'
export type { BookingRedirectProps } from './BookingRedirect'

export { BookingConfirmed } from './BookingConfirmed'
export type { BookingConfirmedProps } from './BookingConfirmed'
