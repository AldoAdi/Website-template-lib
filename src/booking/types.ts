/**
 * The booking funnel, as a closed set of steps.
 *
 * The problem this module exists to solve: the booking CTA hands off to a
 * third-party scheduler on a domain we do not control, so no tag we own can
 * observe the conversion. Routing every booking through a first-party
 * `/book` route puts one measurable choke point in front of that handoff.
 *
 * A phone call is part of the same funnel -- see `call_click` below.
 *
 * `booking_abandoned` is deliberately absent. It is a `booking_view` with no
 * `booking_handoff` in the same session -- derived when the data is queried,
 * never emitted, because the browser that abandons is by definition the one
 * that does not stay to report it.
 */
export type BookingStep =
  /** A CTA that points at the booking route was clicked. */
  | 'cta_click'
  /** The booking route rendered. */
  | 'booking_view'
  /** Navigation to the third-party scheduler was fired. */
  | 'booking_handoff'
  /** The scheduler sent the visitor back to our confirmation route. */
  | 'booking_confirmed'
  /**
   * A tracked `tel:` link was clicked.
   *
   * A call sits in this union rather than in one of its own because, for a
   * local practice, it is the same conversion reached by a different door --
   * and for many of them it is the majority door. Splitting it into a
   * separate event type would mean every report either ignores calls or
   * re-unions them by hand, which is how a channel ends up looking
   * worthless: not because it converts badly, but because nobody counted it.
   *
   * What it cannot tell you is whether the call was answered, or how long it
   * lasted. It is an intent signal with the same ceiling as
   * `booking_handoff`, and it is worth the same caution when bidding on it.
   */
  | 'call_click'

/**
 * Marketing attribution captured from the landing URL and referrer.
 *
 * Every field is optional: most visits carry none of them. Click ids are
 * kept separate from the `utm_*` set because they are what Google Ads and
 * Meta actually join on -- a `utm_campaign` is a label we chose, a `gclid`
 * is a key their system issued.
 */
export interface Attribution {
  readonly utmSource?: string
  readonly utmMedium?: string
  readonly utmCampaign?: string
  readonly utmTerm?: string
  readonly utmContent?: string
  /** Google Ads click id. */
  readonly gclid?: string
  /** Google Ads click id used when the visitor arrived via an iOS web-to-app flow. */
  readonly wbraid?: string
  /** Google Ads click id used for app-to-web flows. */
  readonly gbraid?: string
  /** Meta click id. */
  readonly fbclid?: string
  /** Microsoft Advertising click id. */
  readonly msclkid?: string
  /** `document.referrer` at the moment of capture, when cross-origin. */
  readonly referrer?: string
  /** Path the visitor landed on, without query or hash. */
  readonly landingPath?: string
  /** Epoch milliseconds at capture. */
  readonly capturedAt?: number
}

/** Both halves of the attribution story, as persisted across visits. */
export interface StoredAttribution {
  /** The campaign that first introduced this visitor. Written once, never overwritten. */
  readonly firstTouch: Attribution
  /** The campaign that brought them back this time. Overwritten every visit. */
  readonly lastTouch: Attribution
}

/**
 * One funnel event, as handed to every sink.
 *
 * There is no field here for a name, an email, a phone number, or a reason
 * for the visit, and that is the point: this module logs an anonymous
 * funnel, so nothing it stores is PHI and no part of it pulls a dental
 * practice's website into HIPAA scope. `createIngestHandler` enforces the
 * same rule again at the network boundary.
 */
export interface BookingEvent {
  readonly step: BookingStep
  /** Stable per-browser id. Survives sessions. */
  readonly visitorId: string
  /** Rolls over after `SESSION_TTL_MS` of inactivity. */
  readonly sessionId: string
  /** Epoch milliseconds. */
  readonly at: number
  readonly firstTouch: Attribution
  readonly lastTouch: Attribution
  /** Where on the page the CTA sat, e.g. `'hero'`. Set for `cta_click` and `call_click`. */
  readonly location?: string
}
