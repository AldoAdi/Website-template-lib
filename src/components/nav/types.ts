/**
 * One navigation entry, at any depth.
 *
 * The same shape is used for a top-level link, a dropdown heading, and a
 * leaf inside a mega-menu column, because a site's information architecture
 * is a tree and forcing three types on it only makes the consumer convert
 * between them. Depth is expressed by nesting, not by a `level` field that
 * can disagree with where the item actually sits.
 *
 * `href` is optional: a pure grouping heading ("Patient resources") often
 * has no page of its own. An item with no `href` and no `items` renders
 * nothing useful and is treated as a plain label.
 *
 * The sub-item field is called `items`, not `children`. React's dev-mode
 * element validation treats a prop named `children` as element children
 * wherever it finds one, so a nav tree using that name is reported --
 * across the server/client boundary, from inside whichever component
 * received it -- as "each child in a list should have a unique key", for a
 * list of plain objects that were never elements. The name is the bug.
 */
export interface NavItem {
  readonly label: string
  readonly href?: string
  readonly items?: readonly NavItem[]
  /** Short qualifier rendered under the label in a mega-menu panel. */
  readonly description?: string
}

/** True when the item opens a submenu rather than navigating. */
export function hasSubItems(item: NavItem): boolean {
  return item.items !== undefined && item.items.length > 0
}
