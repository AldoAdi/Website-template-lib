import axe from 'axe-core'

// Rules that cannot produce a meaningful result under jsdom. jsdom does no
// layout and computes no colors, so contrast and any geometry-dependent
// rule would either throw or report a false pass -- disabling them keeps
// the suite honest about what it actually checked.
const JSDOM_UNSUPPORTED_RULES: Readonly<Record<string, { readonly enabled: false }>> = {
  'color-contrast': { enabled: false },
  'target-size': { enabled: false },
}

export interface AxeViolationSummary {
  readonly id: string
  readonly impact: string
  readonly help: string
  readonly nodes: readonly string[]
}

function summarize(violations: readonly axe.Result[]): readonly AxeViolationSummary[] {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    help: violation.help,
    nodes: violation.nodes.map((node) => node.html),
  }))
}

/**
 * Runs axe against a rendered container and returns its violations, already
 * reduced to the fields worth reading in a failure message. Returns an array
 * rather than asserting so the caller owns the expectation -- an empty array
 * is the passing case.
 *
 * Note this is a real but partial check: axe in jsdom catches structural and
 * ARIA problems (landmarks, names, roles, attribute validity) and cannot
 * catch anything requiring layout or color. It is not a substitute for an
 * audit against a real browser.
 */
export async function findAxeViolations(
  container: Element,
): Promise<readonly AxeViolationSummary[]> {
  const results = await axe.run(container, { rules: JSDOM_UNSUPPORTED_RULES })
  return summarize(results.violations)
}
