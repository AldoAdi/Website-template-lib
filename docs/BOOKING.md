# Booking link ownership and funnel tracking

## The problem

A practice's booking CTA points at a third-party scheduler — `flexbook.me`,
Calendly, Zocdoc, whatever. The moment a visitor crosses that boundary, no tag
you own can observe them. You cannot fire a Google Ads conversion, you cannot
tell which campaign produced a booking, and you cannot see where people give up.

Worse, the external URL leaks. It ends up on ads, on a Google Business Profile,
on printed cards. Once it does, changing scheduler means reprinting reality.

## The fix

Put a first-party route in front of the handoff.

```
ad click → yoursite.com/book?utm_source=google&gclid=… → scheduler.example
              │
              ├─ mint bk_vid / bk_sid cookies
              ├─ capture first-touch + last-touch attribution
              ├─ emit booking_view, booking_handoff
              └─ redirect, carrying the session id across
```

`/book` is the URL that goes on every ad and every business card. What sits
behind it is now a config value.

## Wiring a site

### 1. Choose the sinks

```ts
// app/bookingConfig.ts
import { createGaSink, type BookingSink } from '@aldoadi/website-template/booking'

export const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? ''

// One array, referenced everywhere. A new array on each render would retrigger
// BookingRedirect's effect, so keep it module-level.
export const BOOKING_SINKS: readonly BookingSink[] = [createGaSink()]
```

### 2. The booking route

```tsx
// app/book/page.tsx
import { BookingRedirect } from '@aldoadi/website-template/booking'
import { BOOKING_SINKS, BOOKING_URL } from '../bookingConfig'

// A redirector has no content to rank and reads as a doorway page if indexed.
export const metadata = { robots: { index: false, follow: true } }

export default function BookPage() {
  return (
    <BookingRedirect
      providerUrl={BOOKING_URL}
      sinks={BOOKING_SINKS}
      fallback={<a href="tel:+15625550100">Or call (562) 555-0100</a>}
    />
  )
}
```

Keep `/book` out of `sitemap.ts`. The human-readable "Book an appointment" page
stays indexed and points its CTA here.

### 3. The CTAs

```tsx
<BookingLink href="/book" location="hero" sinks={BOOKING_SINKS} className={BUTTON}>
  Book an appointment
</BookingLink>
```

`location` is what lets you rank CTA placements later — which is usually the
first question anyone asks of the data.

### 4. Closing the loop (ask the vendor first)

The funnel measures **intent** and stops at the handoff. Everything on the
scheduler's domain is cross-origin; an iframe does not change that.

Ask your scheduler: _does it support a post-booking redirect or a custom
confirmation URL?_ If yes, point it at `/book/confirmed`:

```tsx
// app/book/confirmed/page.tsx
<BookingConfirmed sinks={BOOKING_SINKS}>
  <p>You're booked. We'll see you soon.</p>
</BookingConfirmed>
```

The visitor's cookies survive the round trip, so this stitches to the handoff
without the vendor passing anything back — and `booking_confirmed` becomes a
real conversion to bid against.

If the answer is no, say so in your reporting. A modelled estimate that gets
presented as an observation is how ad budgets get misallocated.

## Adding your own database

Optional. GA4 alone answers most questions; a database answers the ones GA4
cannot — arbitrary `SELECT`s, retention past 14 months, and joins against
anything else you own.

**This needs a Node runtime.** It cannot run on `output: 'export'`. Move the site
to Vercel (or any Node host) first — `defineNextConfig({ target: 'vercel' })`.

### 1. Write a store

The library ships the interface, not a driver, so your database vendor stays out
of every other site's dependency tree.

```ts
// app/bookingStore.ts
import { neon } from '@neondatabase/serverless'
import type { BookingStore } from '@aldoadi/website-template/booking/server'

const sql = neon(process.env.DATABASE_URL ?? '')

export const bookingStore: BookingStore = {
  async append(event) {
    await sql`
      insert into booking_events
        (step, visitor_id, session_id, at, cta_location, first_touch, last_touch)
      values
        (${event.step}, ${event.visitorId}, ${event.sessionId},
         to_timestamp(${event.at} / 1000.0), ${event.location ?? null},
         ${JSON.stringify(event.firstTouch)}, ${JSON.stringify(event.lastTouch)})
    `
  },
}
```

```sql
create table booking_events (
  id           bigserial primary key,
  step         text        not null,
  visitor_id   text        not null,
  session_id   text        not null,
  at           timestamptz not null,
  cta_location text,
  first_touch  jsonb       not null default '{}',
  last_touch   jsonb       not null default '{}'
);
create index on booking_events (session_id);
create index on booking_events (at desc);
```

### 2. Mount the handler

```ts
// app/api/booking-event/route.ts
import { createIngestHandler } from '@aldoadi/website-template/booking/server'
import { bookingStore } from '../../bookingStore'

export const POST = createIngestHandler(bookingStore)
```

### 3. Add the sink

```ts
export const BOOKING_SINKS = [createGaSink(), createHttpSink('/api/booking-event')]
```

A same-origin endpoint needs no CSP change. A different origin does:

```ts
defineNextConfig({ target: 'vercel', connectSrc: ['https://ingest.example'] })
```

A CSP-blocked beacon fails silently with nothing in the network tab, which looks
exactly like "the funnel doesn't work". Check this first when events go missing.

### The funnel query

```sql
select last_touch->>'utmCampaign' as campaign,
       count(*) filter (where step = 'booking_view')      as reached_book,
       count(*) filter (where step = 'booking_handoff')   as handed_off,
       count(*) filter (where step = 'booking_confirmed') as confirmed
from booking_events
where at > now() - interval '30 days'
group by 1
order by handed_off desc;
```

## Two rules this module will not break

**The redirect never waits on consent.** Someone who rejected the cookie banner
still came to book an appointment. They reach the scheduler exactly like everyone
else; they are simply not recorded.

**Nothing here stores PII.** `BookingEvent` has no field for a name, email, phone,
or reason for visit, and `createIngestHandler` rejects any payload carrying one at
any depth. For a US healthcare practice this is what keeps website analytics out
of HIPAA scope. Capturing a patient's details on your own domain is a different
project, needing a BAA-capable host, consent copy, and a retention policy — not a
prop change.
