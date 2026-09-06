'use client'

import type { ReactElement, ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export interface ThemeProviderProps {
  readonly children: ReactNode
}

/**
 * Wraps next-themes with the library's fixed configuration: class-strategy
 * dark mode (toggles `.dark` on <html>, matching theme.css's `.dark`
 * overrides) and `defaultTheme="system"` so a first-time visitor gets their
 * OS preference rather than a hardcoded default.
 *
 * next-themes injects a small blocking inline script into <head> that reads
 * the persisted choice and sets the class before the page paints -- that
 * script, not anything here, is what prevents a flash of the wrong theme on
 * first load. `suppressHydrationWarning` on the consumer's <html> element is
 * required alongside this so React does not warn about that script-applied
 * class differing from the server-rendered markup.
 */
export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
