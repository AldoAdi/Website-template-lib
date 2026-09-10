// Reached via the "./booking/server" subpath.
//
// Separate from "./booking" on purpose: this half needs a Node runtime, and
// SPEC.md keeps static export as the library's floor. A site building with
// `output: 'export'` never imports this, so the floor holds; a site that
// wants its own funnel database mounts one route handler and gets it.
export { createIngestHandler, containsForbiddenKey, MAX_BODY_BYTES } from './createIngestHandler'
export type { IngestHandlerOptions } from './createIngestHandler'
export { createMemoryBookingStore } from './store'
export type { BookingStore, MemoryBookingStore } from './store'
