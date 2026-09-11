# Proving GTM and GA4 actually fire

Four checkpoints, innermost first. Each one proves a different party did its
job, and they fail in different ways — so when something is broken, the first
one that goes red tells you whose problem it is.

| #   | Checkpoint        | Proves                                                   | Whose fault if red             |
| --- | ----------------- | -------------------------------------------------------- | ------------------------------ |
| 1   | On-page inspector | The site pushed the event                                | Ours (this library)            |
| 2   | GTM Preview       | The container loaded, received it, and a trigger matched | Consent, then container config |
| 3   | GA4 DebugView     | GA4 received it                                          | GA4 tag config                 |
| 4   | Ads conversion    | The conversion imported                                  | Ads ↔ GA4 link                 |

Most "tracking is broken" reports die at #2 or #3. Skipping straight to #4 and
working backwards wastes an afternoon.

---

## Setup

Pick one tag stack. Setting both makes every event arrive twice.

```
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX     # preferred
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX     # only when there is no container
```

GTM is the one to want: it is the only path where a marketer can add an Ads
conversion, a remarketing tag or a call-tracking snippet without a deploy.

Run the sample:

```
npm ci && npm run dev
```

Then open the landing URL a real ad click would produce:

```
http://localhost:3000/?utm_source=google&utm_medium=cpc&utm_campaign=implants&gclid=TEST123&debug=tracking
```

---

## 1. On-page inspector — the site's half

`?debug=tracking` puts a badge in the bottom-left corner. Click it to expand.
It survives navigation for the rest of the session, so it stays open through
the booking click.

Accept the cookie banner, then click **Book an appointment**. You should see,
newest first:

```
booking_handoff   sent via gtm
booking_view      sent via gtm
cta_click         sent via gtm    { cta_location: "hero" }
```

Every row carries `visitor_id`, `session_id`, and both attribution touches —
`first_gclid` and `last_gclid` should both read `TEST123`.

**What this proves:** the site pushed the right events with the right payload.
**What it does not prove:** that anything downstream received them. The panel
reads the library's own emissions, not the network.

Three things it tells you when they go wrong:

- `queued (no consent)` — the cookie banner has not been accepted. Nothing
  fires before consent, by design.
- `sent via none` — neither env var is set, so there is no tag stack at all.
- Panel empty after a CTA click — the click never reached the link. Check
  nothing is overlaying it.

---

## 2. GTM Preview — the container's half

In GTM: **Preview**, enter the site URL, connect.

**Accept the cookie banner in the Preview tab before anything else.** Until you
do, the page has no container on it at all — `GoogleTagManager` renders `null`
until consent is granted, because the container bootstrap is itself a beacon.
Tag Assistant then has nothing to connect to and simply sits there, which reads
as "GTM is broken" and is in fact the consent gate doing its job.

Then repeat the click.

In the Tag Assistant timeline down the left you should see `cta_click`,
`booking_view`, `booking_handoff` and `call_click` as separate events. Click one
→ **Data Layer** tab → the full payload, matching what the inspector showed.

If the events appear here but no tag fired, the container has nothing
configured yet. Create this once:

**Variables** → New → Data Layer Variable, one each. Name them to match the
key exactly:

```
dlv - session_id       →  session_id
dlv - visitor_id       →  visitor_id
dlv - cta_location     →  cta_location
dlv - last_gclid       →  last_gclid
dlv - last_utmCampaign →  last_utmCampaign
```

**Triggers** → New → Custom Event, one per step. Event name is the literal
string — `booking_handoff`, no regex needed. Build one for `call_click` too: it
is a step like any other, and a container assembled without it silently drops
the phone half of the funnel, which on a local business is often the larger
half.

**Tags** → New → Google Analytics: GA4 Event, pointing at your GA4
configuration tag:

| Field                    | Value                                      |
| ------------------------ | ------------------------------------------ |
| Event Name               | `booking_handoff`                          |
| Parameter `session_id`   | `{{dlv - session_id}}`                     |
| Parameter `campaign`     | `{{dlv - last_utmCampaign}}`               |
| Parameter `cta_location` | `{{dlv - cta_location}}`                   |
| Trigger                  | the `booking_handoff` Custom Event trigger |

**If events do not appear in Preview at all**, in order of likelihood:

**1. The banner was never accepted.** See above. Check first: open DevTools →
Network and filter for `gtm.js`. No request at all means no container, which
means consent, not configuration. Note that the container ID lives in a
JavaScript chunk rather than in `index.html` — the component is client-side and
conditional — so grepping view-source for `GTM-` and finding nothing proves
nothing about whether the variable is set.

**2. The container script is blocked.** The commonest cause is CSP — every tag
inside a container loads from an origin this library never allowlisted, and a CSP-blocked tag fails
_silently_, which looks exactly like a misconfigured tag. Add the origin:

```ts
defineNextConfig({
  target: 'vercel',
  scriptSrc: ['https://connect.facebook.net'],
  imgSrc: ['https://www.google.com'],
})
```

On GitHub Pages the CSP is a `<meta>` tag built from the same options.

---

## 3. GA4 DebugView — GA4's half

GA4 → Admin → **DebugView**. With GTM Preview connected, your session appears
automatically.

Click through the funnel again. `cta_click`, `booking_view` and
`booking_handoff` should arrive within seconds, each expandable to show its
parameters.

Then, once and permanently: GA4 → Admin → **Custom definitions** → create an
event-scoped custom dimension for every parameter you want to report on
(`session_id`, `cta_location`, `campaign`). **Parameters not registered here
are collected but never queryable** — they simply will not appear in any
report, and there is no warning. This is the single most common reason a
correctly-firing setup produces empty reports.

Mark `booking_handoff` as a **key event** (Admin → Events) so it can be
imported into Ads.

---

## 4. Google Ads — the money

Ads → Goals → Conversions → **Import** → Google Analytics 4 → your
`booking_handoff` key event.

Allow up to 24 hours before judging. Conversion import is not real-time, and
neither is the Ads ↔ GA4 link.

**Sanity check that catches most misattribution:** in GA4, open the
`booking_handoff` event and confirm `session_source` is `google` / `cpc` and
not `(direct)`. `(direct)` on a click you know came from an ad means the
`gclid` was lost before the event fired — which is what `AttributionCapture`
in the root layout exists to prevent. Confirm it is mounted.

---

## The honest limit

Everything above stops at `booking_handoff`. The scheduler is on a domain we
do not control, so what happens after the redirect is unobservable — an
iframe would not change that.

`booking_confirmed` only becomes real if the vendor supports a post-booking
redirect to `/book/confirmed`. **Ask them**, and note that the answer is not
always yes:

| Vendor                      | Post-booking redirect       | Funnel ends at      |
| --------------------------- | --------------------------- | ------------------- |
| Cal.com                     | Yes (Event Type → Advanced) | `booking_confirmed` |
| Flex Dental (`flexbook.me`) | **No** — asked and answered | `booking_handoff`   |

On a vendor with no redirect there is a fifth checkpoint you cannot automate,
and skipping it is how ad budgets get misallocated:

### 5. Reconciliation — monthly, by hand

Ask the front desk for the count of online bookings in a window. Compare it
against `booking_handoff` in GA4 for the same window. That ratio is your
handoff→booked rate.

It matters because **optimising Ads on `booking_handoff` is only sound while
that rate is roughly constant across campaigns** — and it probably is not. An
emergency click and an implants click hit the same scheduler and abandon at
different rates. Bidding on handoffs then over-weights whichever converts worse
downstream, invisibly, because both look identical in the report.

If bookings can be split by service type, compare against handoffs split by
campaign. Divergence between the two is the risk, made visible.

Until you have that number, report `booking_handoff` to the client as booking
**requests**, never as bookings. A modelled estimate presented as an
observation is how ad budgets get misallocated.

### Worth one more email

"No redirect" is not "no webhook". Any scheduler that writes into a practice
management system already has server-side plumbing — Flex connects
bidirectionally with Open Dental and exposes an API. Ask for (a) an
appointment-created **webhook**, which closes the loop with no redirect at all,
and (b) whether unknown query parameters such as the `bk_sid` we already send
are stored or echoed anywhere on the appointment record. Either answer turns
reconciliation from statistical into exact.
