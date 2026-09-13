'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { hasSubItems } from './types'
import type { NavItem } from './types'

export interface MegaMenuProps {
  readonly items: readonly NavItem[]
  readonly className?: string
}

const TRIGGER_CLASSES =
  'hover:text-primary inline-flex items-center gap-1 py-2 text-sm font-medium aria-expanded:text-primary'

const PANEL_BASE_CLASSES =
  'border-border bg-background absolute top-full z-50 mt-0 w-max max-w-[min(56rem,calc(100vw-2rem))] rounded-b-lg border border-t-0 p-6 shadow-lg'

// Anchored from its trigger's left edge by default, which runs the panel
// off the right edge of the viewport once the trigger itself is in the
// right half of the bar. Right-anchoring those instead keeps every panel
// on screen without needing to measure anything at runtime.
const PANEL_LEFT_CLASSES = 'left-0'
const PANEL_RIGHT_CLASSES = 'right-0 left-auto'

const COLUMN_LINK_CLASSES = 'hover:text-primary block py-1 text-sm'
// Same metrics as COLUMN_LINK_CLASSES, minus the hover affordance a
// non-interactive label should not carry.
const COLUMN_LABEL_CLASSES = 'block py-1 text-sm'

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
 * Hover and click share one trigger, so they have to agree rather than
 * fight: a mouse click that lands right after a hover-open must not read as
 * "close what I just opened", or a mouse user who clicks the item they are
 * already pointing at can never get the panel open. `hoverOpenedRef` marks
 * that the *next* click on this bar is that click -- it keeps the panel
 * open (rather than toggling) once, then gets out of the way. A touch tap
 * never sets it (`onPointerEnter` ignores non-mouse pointer types, and
 * touch has no separate hover phase to fire it from anyway), so a tap
 * always gets the plain open/close toggle.
 *
 * Hidden below `md`; `MobileNavTree` is the small-screen counterpart.
 */
export function MegaMenu({ items, className }: MegaMenuProps): ReactElement {
  const [openLabel, setOpenLabel] = useState<string | null>(null)
  const baseId = useId()
  const barRef = useRef<HTMLUListElement>(null)
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const hoverOpenedRef = useRef(false)

  const close = useCallback((): void => {
    hoverOpenedRef.current = false
    setOpenLabel(null)
  }, [])

  // Closes any open panel across a client-side navigation, which swaps the
  // page under a persistent header without ever unmounting it. Adjusting
  // state during render (rather than in an effect) is the pattern React's
  // docs recommend for "reset state when a prop changes" -- it avoids the
  // extra commit an effect-based reset would cost, and the repo's lint
  // config flags a synchronous `setState` inside an effect regardless.
  //
  // `hoverOpenedRef` is left alone here: refs cannot be written during
  // render (only state may), and there is nothing to fix -- the panel is
  // closed either way afterward, so a stale `true` and a `false` drive the
  // next click to the same open outcome.
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpenLabel(null)
  }

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

  function onTriggerPointerEnter(label: string, pointerType: string): void {
    // Touch (and pen) delivers a pointerenter immediately before its click,
    // with no separate hover dwell -- treating that as a hover-open would
    // make the very first tap open-then-instantly-reopen instead of the
    // plain toggle a tap expects.
    if (pointerType !== 'mouse') return
    hoverOpenedRef.current = true
    setOpenLabel(label)
  }

  function onTriggerClick(label: string, isOpen: boolean): void {
    if (hoverOpenedRef.current) {
      hoverOpenedRef.current = false
      setOpenLabel(label)
      return
    }
    setOpenLabel(isOpen ? null : label)
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
            <li key={`${index}-${item.label}`}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-primary py-2 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="py-2 text-sm font-medium">{item.label}</span>
              )}
            </li>
          )
        }

        const panelId = `${baseId}-panel-${index}`
        const isOpen = openLabel === item.label
        const isRightHalf = index >= items.length / 2
        const panelClasses = `${PANEL_BASE_CLASSES} ${isRightHalf ? PANEL_RIGHT_CLASSES : PANEL_LEFT_CLASSES}`

        return (
          <li
            key={`${index}-${item.label}`}
            className="relative"
            onPointerEnter={(event) => onTriggerPointerEnter(item.label, event.pointerType)}
          >
            <button
              type="button"
              ref={(node) => {
                if (node) triggerRefs.current.set(item.label, node)
                else triggerRefs.current.delete(item.label)
              }}
              className={TRIGGER_CLASSES}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => onTriggerClick(item.label, isOpen)}
            >
              {item.label}
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </button>

            {isOpen ? (
              <div id={panelId} className={panelClasses}>
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
      {subItems.map((child, index) => (
        <li key={`${index}-${child.label}`}>
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
              {(child.items ?? []).map((leaf, leafIndex) => (
                <li key={`${leafIndex}-${leaf.label}`}>
                  {leaf.href ? (
                    <Link href={leaf.href} className={COLUMN_LINK_CLASSES}>
                      {leaf.label}
                    </Link>
                  ) : (
                    <span className={COLUMN_LABEL_CLASSES}>{leaf.label}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
