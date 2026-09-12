import type { ReactElement } from 'react'
import Link from 'next/link'
import { hasSubItems } from './types'
import type { NavItem } from './types'

export interface MobileNavTreeProps {
  readonly items: readonly NavItem[]
  readonly className?: string
}

const SUMMARY_CLASSES =
  'flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium marker:content-none [&::-webkit-details-marker]:display-none'

const LEAF_CLASSES = 'hover:text-primary block py-2 text-sm'

/**
 * Small-screen navigation: nested native disclosures.
 *
 * `<details>` is the whole implementation. It is keyboard operable, exposes
 * expanded state to assistive technology, survives with JavaScript still
 * loading, and -- the part that matters on a menu this deep -- costs no
 * state at all, so a server component can render it. A hand-rolled
 * accordion here would be ~80 lines reimplementing a browser feature, and
 * would have to be a client component.
 *
 * ponytail: no "only one section open at a time". `<details name>` gives
 * that natively where supported; add a polyfill only if the tree gets deep
 * enough that scrolling past open siblings actually annoys someone.
 */
export function MobileNavTree({ items, className }: MobileNavTreeProps): ReactElement {
  return (
    <ul className={className ? `flex flex-col ${className}` : 'flex flex-col'}>
      {items.map((item) => (
        <li key={item.label} className="border-border border-b last:border-b-0">
          {hasSubItems(item) ? (
            <details>
              <summary className={SUMMARY_CLASSES}>
                <span>{item.label}</span>
                <span aria-hidden="true" className="text-xs">
                  ▾
                </span>
              </summary>
              {/*
                Both children carry an explicit `key` even though this is
                not a mapped list. One of them is conditional, which is
                enough for the JSX transform to emit a *dynamic* children
                array rather than a static one -- and React then asks every
                element in it for a key, warning from inside this component
                about a list the consumer never wrote. The keys are
                constant because the positions are.
              */}
              <div className="border-border ml-3 border-l pl-3">
                {/* The group itself is often a real page ("Our services"),
                    and a visitor who opened the group to look at it should
                    not have to guess that the heading was clickable. */}
                {item.href ? (
                  <Link key="self" href={item.href} className={`${LEAF_CLASSES} font-semibold`}>
                    {`All ${item.label}`}
                  </Link>
                ) : null}
                <MobileNavTree key="sub" items={item.items ?? []} />
              </div>
            </details>
          ) : (
            <Link href={item.href ?? '#'} className={LEAF_CLASSES}>
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
