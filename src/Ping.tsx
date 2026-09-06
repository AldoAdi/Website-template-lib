import type { ReactElement } from 'react'

// Throwaway component for T2 (walking skeleton).
// Proves raw-TS distribution + Tailwind `@source` scanning of a node_modules
// package. Deleted at the end of T3 once both assumptions are confirmed.
export function Ping(): ReactElement {
  return (
    <div className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white">
      Ping
    </div>
  )
}
