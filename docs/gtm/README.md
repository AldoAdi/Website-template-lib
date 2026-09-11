# Importing the booking funnel into GTM

The site pushes a complete funnel into `dataLayer`. Until a container does
something with it, **GA4 receives nothing** — every event fires into a container
that ignores it, and the tracking looks broken when it is merely unconfigured.

`container-export.json` is that configuration, ready to import: 10 variables,
5 triggers, 6 tags. Building it by hand is about forty minutes of clicking, and
every one of those clicks can introduce a typo that fails **silently** — a
variable named `session_Id` produces no error anywhere, just a dimension that is
permanently empty.

## Read this before you click Import

> **Choose Merge, never Overwrite.**
>
> GTM's import screen offers both. **Overwrite deletes everything already in the
> container** and is not undoable from that screen. Pick **Merge**, and
> **Rename conflicting tags, triggers and variables**.

Import into a **new workspace**, not directly into the live one. Preview it,
confirm it, then publish. Never publish an import blind.

## Steps

1. GTM → **Admin** → **Import Container**.
2. Choose `container-export.json`.
3. Workspace: **New**, name it something like `booking-funnel`.
4. Import option: **Merge** → **Rename conflicting tags, triggers and
   variables**.
5. Review the preview of what will change, then **Confirm**.

## The one field to edit

**Variables** → `GA4 Measurement ID` → replace `G-XXXXXXXXXX` with your real
one.

That constant feeds the Google tag and all five event tags, so it is the only
place the ID appears. Change it once and everything follows.

## If your container already has a Google tag

Delete the imported one, named `Google tag`. Two Google tags for the same
property double-counts every hit, including page views — and a doubled baseline
is worse than no baseline, because it looks plausible.

The five `GA4 - *` event tags do not reference it, so deleting it breaks
nothing: each carries its own `measurementIdOverride` pointing at the constant.

## What you just installed

| Trigger                  | Fires on                          | Tag                       |
| ------------------------ | --------------------------------- | ------------------------- |
| `CE - cta_click`         | A booking CTA was clicked         | `GA4 - cta_click`         |
| `CE - booking_view`      | The `/book` route rendered        | `GA4 - booking_view`      |
| `CE - booking_handoff`   | Navigation to the scheduler fired | `GA4 - booking_handoff`   |
| `CE - booking_confirmed` | The scheduler sent them back      | `GA4 - booking_confirmed` |
| `CE - call_click`        | A tracked `tel:` link was clicked | `GA4 - call_click`        |

Every event tag sends the same nine parameters, so any of them can be split by
placement or campaign without going back into GTM:

| GA4 parameter    | dataLayer key       |
| ---------------- | ------------------- |
| `bk_session_id`  | `session_id`        |
| `bk_visitor_id`  | `visitor_id`        |
| `cta_location`   | `cta_location`      |
| `booking_step`   | `booking_step`      |
| `gclid`          | `last_gclid`        |
| `campaign`       | `last_utmCampaign`  |
| `source`         | `last_utmSource`    |
| `medium`         | `last_utmMedium`    |
| `first_campaign` | `first_utmCampaign` |

The `utm_*` keys are camelCase on the dataLayer because they mirror the
library's `Attribution` interface. They are remapped to snake_case here rather
than carried through, because GA4 dimension names are case-sensitive and
`last_utmCampaign` is an unpleasant thing to find in a report two years from
now.

**The two ids carry a `bk_` prefix, and that is not cosmetic.** `session_id` is
a _reserved_ GA4 parameter name — GA4 attaches its own to every event — so a
parameter called `session_id` collides with a built-in and GA4 refuses to
register it as a custom dimension at all. `visitor_id` is prefixed alongside it
for symmetry, and because a bare id is exactly the sort of name a future
reservation takes next.

## Then GA4, and this part is not retroactive

GA4 → **Admin** → **Custom definitions** → **Create custom dimension**, scope
**Event**, one each:

| Dimension name | Event parameter |
| -------------- | --------------- |
| CTA location   | `cta_location`  |
| Campaign       | `campaign`      |
| Booking step   | `booking_step`  |

**Do this before the traffic, not after the question.** An unregistered
parameter is collected and then discarded from reporting: it is never queryable,
and registering it later does not reach back. Every event that arrived before
the definition existed is gone for reporting purposes, permanently.

**Deliberately not registered: `bk_session_id` and `bk_visitor_id`.** Both are
unique per session or per browser, and a custom dimension with unbounded
cardinality is actively harmful in GA4 — past the cardinality limit, rows
collapse into a single `(other)` bucket and take the _useful_ dimensions in
the same report down with them. They are still sent, because they are what
makes one journey legible in DebugView and in your own ingest endpoint, where
no such limit applies. Session stitching in reports is GA4's own job; that is
what its reserved `session_id` is for.

## Confirming it works

1. **GTM Preview.** Connect, **accept the cookie banner** (until you do there is
   no container on the page at all — see
   [VERIFYING-TRACKING.md](../VERIFYING-TRACKING.md) §2), then click a booking
   CTA and a phone link. You should see `cta_click` and `call_click` in the
   timeline with their tags firing, not merely the events arriving.
2. **GA4 DebugView.** Admin → DebugView, with Preview still connected. The same
   events, with `bk_session_id` and `cta_location` populated. Parameters show
   in DebugView whether or not they are registered as dimensions — which is
   exactly why `bk_session_id` is worth sending.

That second screen is the first moment anything reaches GA4. Until you have seen
it, the funnel is unproven no matter how green everything else looks.

## If the import is refused

This export was written by hand and **has not been round-tripped through a real
GTM import**. If GTM rejects it, nothing is applied — imports do not partially
succeed — so fall back to the manual recipe in
[VERIFYING-TRACKING.md](../VERIFYING-TRACKING.md) §2, which builds the same
thing a click at a time. Please open an issue with the error if that happens.
