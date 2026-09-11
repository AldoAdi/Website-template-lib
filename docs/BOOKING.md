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

### 1. Point at the scheduler

```ts
// app/bookingConfig.ts
export const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? ''
export const BOOKING_PATH = '/book'
```

Sinks need no wiring. They are resolved from the environment
(`getBookingSinks`): GA4 always, plus a first-party ingest sink if
`NEXT_PUBLIC_BOOKING_INGEST_URL` is set.

They are deliberately _not_ props. A sink is an object carrying functions, and
Next forbids passing a function from a server component to a client one — so
prop-passing would fail the build on any ordinary page. To override them, call
`configureBookingSinks` from a `'use client'` module imported by the root
layout. Most sites never need to.

### 2. The booking route

```tsx
// app/book/page.tsx
import { BookingRedirect } from '@aldoadi/website-template/booking'
import { BOOKING_URL } from '../bookingConfig'

// A redirector has no content to rank and reads as a doorway page if indexed.
export const metadata = { robots: { index: false, follow: true } }

export default function BookPage() {
  return (
    <BookingRedirect
      providerUrl={BOOKING_URL}
      fallback={<a href="tel:+15625550100">Or call (562) 555-0100</a>}
    />
  )
}
```

Keep `/book` out of `sitemap.ts`. The human-readable "Book an appointment" page
stays indexed and points its CTA here.

### 3. The CTAs

```tsx
<Hero
  headline="…"
  primaryActionSlot={
    <BookingLink href="/book" location="hero" className={HERO_PRIMARY_ACTION_CLASSES}>
      Book an appointment
    </BookingLink>
  }
/>
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
<BookingConfirmed>
  <p>You're booked. We'll see you soon.</p>
</BookingConfirmed>
```

The visitor's cookies survive the round trip, so this stitches to the handoff
without the vendor passing anything back — and `booking_confirmed` becomes a
real conversion to bid against. Verified end to end against Cal.com, which does
support it: the `session_id` on `booking_confirmed` matches the one sent to the
scheduler, and the original `gclid` is still attached.

#### When the vendor says no

Some do. **Flex Dental (`flexbook.me`) has no post-booking redirect** — asked
and answered — so on a Flex practice `booking_confirmed` can never fire and the
funnel is permanently capped at `booking_handoff`.

That is not just a missing number. It creates a bidding risk worth naming:

> Optimising Google Ads on `booking_handoff` is only sound while the
> handoff→booked rate is roughly **constant across campaigns**.

It probably is not. An "emergency dentist" click and an "Invisalign" click hit
the same scheduler and abandon at different rates — insurance not accepted, the
service not bookable online, a scheduler flow that suits one appointment type
better than another. If implants completes at 60% past the handoff and
emergencies at 25%, bidding on handoffs systematically over-weights emergencies
while both read as wins on the dashboard.

**The cheap measurement.** Monthly, ask the front desk for the count of online
bookings in a window and compare it against `booking_handoff` in GA4 for the
same window. That gives one blended handoff→booked rate. If the practice can
split their bookings by service type, compare that against handoffs split by
campaign — divergence between the two is exactly the risk above, made visible.

Until you have that number, `booking_handoff` is a **ranking signal between
campaigns**, not a booking count. Report it to the client as booking _requests_.
A modelled estimate presented as an observation is how ad budgets get
misallocated.

**Before accepting the cap, ask one more question.** "No redirect" is not "no
webhook". A scheduler that integrates with a practice management system already
has server-side plumbing — Flex, for instance, connects bidirectionally with
Open Dental and exposes an API. Two things worth asking any vendor:

1. Is there an **appointment-created webhook**? That closes the loop server-side
   with no redirect at all — point it at an ingest route (see below) and match
   on timestamp or on the id in (2).
2. Do they **store or echo unknown query parameters**? `buildBookingUrl` already
   sends `bk_sid` across. If it lands anywhere readable on the appointment
   record, reconciliation stops being statistical and becomes exact.

## Proving it works

See [VERIFYING-TRACKING.md](./VERIFYING-TRACKING.md) — the on-page inspector,
GTM Preview, GA4 DebugView and the Ads import, in the order that tells you
whose fault a failure is.

The short version: append `?debug=tracking` to any page and a panel shows every
event the library sent, its full payload, the transport that carried it, and
whether consent held it back.

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

### 3. Turn on the sink

One environment variable — no code change:

```
NEXT_PUBLIC_BOOKING_INGEST_URL=/api/booking-event
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
