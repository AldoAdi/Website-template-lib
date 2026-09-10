/**
 * Typed wrapper over GTM's `window.dataLayer`.
 *
 * Mirrors `gtag.ts`, which does the same job for direct GA4. The two are
 * alternatives, never both at once -- see `resolveTransport` in `index.ts`
 * for why.
 *
 * `window.dataLayer` is already declared by `@next/third-parties`, so this
 * module deliberately does not redeclare it -- a second `declare global`
 * with a different element type is a hard type error, not a merge.
 */

/**
 * Resolves the GTM container ID from the environment. Read fresh on every
 * call for the same reason `getGaId` is: a consuming app's env can change
 * between calls in tests, and in a real Next build `process.env.NEXT_PUBLIC_*`
 * is inlined by the bundler anyway.
 *
 * Unlike `getGaId` this never warns when unset. Running without a container
 * is an ordinary configuration -- it just means the site sends to GA4
 * directly -- so warning here would fire on every correctly-configured
 * GA4-only site. `resolveTransport` owns the one case worth complaining
 * about: neither of them configured.
 */
export function getGtmId(): string | undefined {
  return process.env.NEXT_PUBLIC_GTM_ID || undefined
}

/**
 * Pushes an event onto the dataLayer.
 *
 * Creates the array if GTM's own snippet has not run yet: that is the
 * documented GTM pattern, and it is what lets an event fired during
 * hydration survive until the container loads and replays the queue.
 *
 * The `event` key is what GTM triggers match on -- a Custom Event trigger
 * named `booking_handoff` fires on exactly this push. Everything else on
 * the object becomes available as a dataLayer variable.
 */
export function dataLayerPush(event: string, props: Readonly<Record<string, unknown>>): void {
  if (typeof window === 'undefined') return

  window.dataLayer ??= []
  window.dataLayer.push({ event, ...props })
}
