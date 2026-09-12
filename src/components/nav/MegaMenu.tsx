'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import Link from 'next/link'
import { hasSubItems } from './types'
import type { NavItem } from './types'

export interface MegaMenuProps {
  readonly items: readonly NavItem[]
  readonly className?: string
}

const TRIGGER_CLASSES =
  'hover:text-primary inline-flex items-center gap-1 py-2 text-sm font-medium aria-expanded:text-primary'

const PANEL_CLASSES =
  'border-border bg-background absolute top-full left-0 z-50 mt-0 w-max max-w-[min(56rem,calc(100vw-2rem))] rounded-b-lg border border-t-0 p-6 shadow-lg'

const COLUMN_LINK_CLASSES = 'hover:text-primary block py-1 text-sm'

/**
 * Desktop primary navigation with mega-menu panels.
 *
 * Interaction model is a set of disclosures, not an ARIA menubar. A menubar
 * (`role="menu"` and friends) describes an application menu whose items are
 * commands; these items are links, and applying menu roles to links breaks
 * the things a visitor expects of a link -- open in a new tab, copy address,
 * "found in page" search. Buttons with `aria-expanded` describe what this
 * actually is, and need no roving tabindex to be usable.
 *
 * Only one panel is open at a time, it closes on Escape (returning focus to
 * its trigger, or the visitor is stranded mid-page with nothing focused),
 * and it closes when focus or the pointer leaves the bar. Hover opens a
 * panel for mouse users but is never the only way in.
 *
 * Hidden below `md`; `MobileNavTree` is the small-screen counterpart.
 */
export function MegaMenu({ items, className }: MegaMenuProps): ReactElement {
  const [openLabel, setOpenLabel] = useState<string | null>(null)
  const baseId = useId()
  const barRef = useRef<HTMLUListElement>(null)
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>())

  const close = useCallback((): void => setOpenLabel(null), [])

  useEffect(() => {
    if (openLabel === null) return undefined

    function onPointerDown(event: PointerEvent): void {
      if (!barRef.current?.contains(event.target as Node)) close()
    }

    // Pointer-down rather than click: a click that lands outside also lands
    // on whatever is underneath, and closing first keeps the panel from
    // swallowing that first interaction.
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openLabel, close])

  function onKeyDown(event: React.KeyboardEvent<HTMLUListElement>): void {
    if (event.key !== 'Escape' || openLabel === null) return

    const trigger = triggerRefs.current.get(openLabel)
    close()
    trigger?.focus()
  }

  return (
    <ul
      ref={barRef}
      className={className ? `flex items-center gap-6 ${className}` : 'flex items-center gap-6'}
      onKeyDown={onKeyDown}
      onMouseLeave={close}
      // A panel left open after focus has moved past the bar sits over the
      // content the visitor just tabbed to. `focusout` fires before the new
      // element is focused, so `relatedTarget` is what to test.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      {items.map((item, index) => {
        if (!hasSubItems(item)) {
          return (
            <li key={item.label}>
              <Link href={item.href ?? '#'} className="hover:text-primary py-2 text-sm font-medium">
                {item.label}
              </Link>
            </li>
          )
        }

        const panelId = `${baseId}-panel-${index}`
        const isOpen = openLabel === item.label

        return (
          <li key={item.label} className="relative" onMouseEnter={() => setOpenLabel(item.label)}>
            <button
              type="button"
              ref={(node) => {
                if (node) triggerRefs.current.set(item.label, node)
                else triggerRefs.current.delete(item.label)
              }}
              className={TRIGGER_CLASSES}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenLabel(isOpen ? null : item.label)}
            >
              {item.label}
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </button>

            {isOpen ? (
              <div id={panelId} className={PANEL_CLASSES}>
                <MegaMenuPanel item={item} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * One open panel's contents.
 *
 * A sub-item with sub-items of its own becomes a titled column; one
 * without them is a plain link. Both shapes can appear side by side in the same panel,
 * which is what a real service list looks like -- "Invisalign" has no
 * sub-treatments, "Restorative dentistry" has eight.
 */
function MegaMenuPanel({ item }: { readonly item: NavItem }): ReactElement {
  const subItems = item.items ?? []

  return (
    <ul className="grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-3">
      {subItems.map((child) => (
        <li key={child.label}>
          {child.href ? (
            <Link
              href={child.href}
              className="hover:text-primary text-sm font-semibold tracking-wide"
            >
              {child.label}
            </Link>
          ) : (
            <span className="text-sm font-semibold tracking-wide">{child.label}</span>
          )}
          {child.description ? (
            <p className="text-muted-foreground mt-1 text-xs">{child.description}</p>
          ) : null}
          {hasSubItems(child) ? (
            <ul className="text-muted-foreground mt-2">
              {(child.items ?? []).map((leaf) => (
                <li key={leaf.label}>
                  <Link href={leaf.href ?? '#'} className={COLUMN_LINK_CLASSES}>
                    {leaf.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
