'use client'

import { useSyncExternalStore } from 'react'
import { getConsentState, hasConsentFor, onConsentChange } from './consent'
import type { ConsentCategory, ConsentState } from './consent'

// useSyncExternalStore's subscribe contract takes a callback with no
// arguments -- it only needs to know "something changed", then re-invokes
// the snapshot getter itself. `onConsentChange` is the module's general
// pub/sub API and passes the new state to its listener; this adapter just
// ignores that argument.
function subscribe(onStoreChange: () => void): () => void {
  return onConsentChange(() => onStoreChange())
}

// The server cannot know the visitor's stored decision, so it cannot render
// the correct one -- this is the exact server/client split ThemeToggle
// documents. Both the server render and the client's first paint therefore
// report 'unknown'; the real, possibly-different state swaps in a moment
// later once mounted, which is a state update rather than a disagreement
// between server and client markup, so no hydration mismatch.
function getServerSnapshot(): ConsentState {
  return 'unknown'
}

/**
 * Subscribes a component to the consent decision.
 *
 * Every consent-aware component in the library needs the same three pieces
 * (subscribe adapter, client snapshot, server snapshot) and gets them wrong
 * in the same way if each writes its own -- most often by returning a fresh
 * object from the snapshot getter and looping forever. One hook, one
 * correct implementation.
 */
export function useConsentState(): ConsentState {
  return useSyncExternalStore(subscribe, getConsentState, getServerSnapshot)
}

/**
 * Subscribes a component to one consent category.
 *
 * Returns a boolean rather than the whole `ConsentCategories` record on
 * purpose: `useSyncExternalStore` compares snapshots with `Object.is`, and
 * `getConsentCategories()` builds a fresh object on every call, so a
 * record-shaped snapshot would be a new value every time React checked and
 * would re-render forever.
 */
export function useConsentFor(category: ConsentCategory): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasConsentFor(category),
    // The server has no access to storage, so it must assume the
    // conservative answer -- and the client's first paint must agree with
    // it or the markup mismatches.
    () => false,
  )
}
