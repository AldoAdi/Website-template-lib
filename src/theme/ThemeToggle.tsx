'use client'

import { useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import { useTheme } from 'next-themes'

const THEME_CYCLE = ['light', 'dark', 'system'] as const
type CycleTheme = (typeof THEME_CYCLE)[number]

const THEME_LABELS: Readonly<Record<CycleTheme, string>> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

function isCycleTheme(value: string | undefined): value is CycleTheme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function nextTheme(current: CycleTheme): CycleTheme {
  const currentIndex = THEME_CYCLE.indexOf(current)
  const nextIndex = (currentIndex + 1) % THEME_CYCLE.length
  return THEME_CYCLE[nextIndex] ?? THEME_CYCLE[0]
}

const subscribeToNothing = (): (() => void) => () => {}

/**
 * True once the component has hydrated on the client, false during server
 * rendering and the client's first render pass. Implemented with
 * useSyncExternalStore (rather than `useState` + `useEffect`) because that
 * effect-based version calls setState synchronously inside an effect, which
 * triggers an avoidable extra render and is flagged by react-hooks lint
 * rules; useSyncExternalStore's server/client snapshot split is the
 * React-documented way to answer "is this the client, post-hydration?".
 */
function useIsMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

/**
 * Cycles light -> dark -> system on activation. Renders a native <button>
 * so keyboard activation (Enter/Space) and focus handling come for free.
 *
 * Theme-dependent text is withheld until after mount: next-themes cannot
 * know the resolved theme during server rendering, so rendering the real
 * label immediately would make the client's first render disagree with the
 * server's, which React reports as a hydration mismatch. Server and the
 * client's first paint both render the same "system" fallback; the real
 * label swaps in a moment later, once mounted.
 */
export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme()
  const isMounted = useIsMounted()

  const current: CycleTheme = isMounted && isCycleTheme(theme) ? theme : 'system'
  const upcoming = nextTheme(current)

  return (
    <button
      type="button"
      onClick={() => setTheme(upcoming)}
      aria-label={`Theme: ${THEME_LABELS[current]}. Activate to switch to ${THEME_LABELS[upcoming]} theme.`}
    >
      {THEME_LABELS[current]}
    </button>
  )
}
