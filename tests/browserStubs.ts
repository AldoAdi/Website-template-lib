import { vi } from 'vitest'

/**
 * Test-only stubs for the browser APIs jsdom does not implement.
 *
 * They are deliberately minimal: each one records what the component asked
 * for and lets the test drive the callback, so a spec asserts on behaviour
 * ("it reveals when it intersects") rather than on the fact that a
 * constructor was called.
 */

export interface IntersectionObserverStub {
  /** Fires every registered observer's callback with the given intersection state. */
  readonly trigger: (isIntersecting: boolean) => void
  readonly disconnectCount: () => number
}

export function stubIntersectionObserver(): IntersectionObserverStub {
  const callbacks: IntersectionObserverCallback[] = []
  let disconnects = 0

  class Stub {
    constructor(private readonly callback: IntersectionObserverCallback) {
      callbacks.push(callback)
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {
      disconnects += 1
    }
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  vi.stubGlobal('IntersectionObserver', Stub)

  return {
    trigger(isIntersecting: boolean): void {
      for (const callback of callbacks) {
        callback(
          [{ isIntersecting } as IntersectionObserverEntry],
          undefined as unknown as IntersectionObserver,
        )
      }
    },
    disconnectCount: () => disconnects,
  }
}

export function stubResizeObserver(): void {
  class Stub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  vi.stubGlobal('ResizeObserver', Stub)
}

/**
 * Makes an element look scrollable to the carousel's edge maths, which
 * jsdom otherwise reports as a zero-size box that is at both ends at once.
 */
export function fakeScrollMetrics(
  element: HTMLElement,
  metrics: {
    readonly scrollLeft: number
    readonly clientWidth: number
    readonly scrollWidth: number
  },
): void {
  Object.defineProperties(element, {
    scrollLeft: { configurable: true, writable: true, value: metrics.scrollLeft },
    clientWidth: { configurable: true, value: metrics.clientWidth },
    scrollWidth: { configurable: true, value: metrics.scrollWidth },
  })
}
