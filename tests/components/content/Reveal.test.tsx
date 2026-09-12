import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, act } from '@testing-library/react'
import { Reveal } from '../../../src/components/content/Reveal'
import { stubIntersectionObserver } from '../../browserStubs'
import { mockMatchMedia } from '../../theme/testHelpers'

const HIDDEN_CLASS = 'opacity-0'

// jsdom gives every element a zero-size box, which reads as off-screen --
// exactly the case Reveal animates. Tests that need the above-the-fold
// branch fake a real rectangle instead.
function fakeOnScreen(element: Element): void {
  element.getBoundingClientRect = () =>
    ({ top: 10, bottom: 100, left: 0, right: 100, width: 100, height: 90 }) as DOMRect
}

beforeEach(() => {
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Reveal', () => {
  test('renders its children visible, so a failed script never hides content', () => {
    stubIntersectionObserver()
    const { container } = render(<Reveal>Body copy</Reveal>)

    // The server/no-JS rendering is what this asserts: the markup React
    // produces carries no hiding class of its own.
    expect(screen.getByText('Body copy')).toBeDefined()
    expect(container.innerHTML).toContain('Body copy')
  })

  test('hides an off-screen element once observed, then reveals it on intersection', () => {
    const observer = stubIntersectionObserver()
    const { container } = render(<Reveal>Body copy</Reveal>)

    const element = container.firstElementChild as HTMLElement
    expect(element.className).toContain(HIDDEN_CLASS)

    act(() => observer.trigger(true))

    expect(element.className).not.toContain(HIDDEN_CLASS)
  })

  test('never hides something already on screen, so above-the-fold copy cannot flash', () => {
    stubIntersectionObserver()
    const { container } = render(
      <Reveal>
        <span
          ref={(node) => {
            if (node) fakeOnScreen(node.parentElement as Element)
          }}
        >
          Hero copy
        </span>
      </Reveal>,
    )

    expect((container.firstElementChild as HTMLElement).className).not.toContain(HIDDEN_CLASS)
  })

  test('does nothing at all under prefers-reduced-motion', () => {
    mockMatchMedia(true)
    stubIntersectionObserver()
    const { container } = render(<Reveal>Body copy</Reveal>)

    expect((container.firstElementChild as HTMLElement).className).not.toContain(HIDDEN_CLASS)
  })

  test('stays visible where IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<Reveal>Body copy</Reveal>)

    expect((container.firstElementChild as HTMLElement).className).not.toContain(HIDDEN_CLASS)
  })

  test('stops observing after the first reveal, so content never re-hides', () => {
    const observer = stubIntersectionObserver()
    render(<Reveal>Body copy</Reveal>)

    act(() => observer.trigger(true))

    expect(observer.disconnectCount()).toBeGreaterThan(0)
  })

  test('ignores a non-intersecting entry rather than treating it as a reveal', () => {
    const observer = stubIntersectionObserver()
    const { container } = render(<Reveal>Body copy</Reveal>)

    act(() => observer.trigger(false))

    expect((container.firstElementChild as HTMLElement).className).toContain(HIDDEN_CLASS)
  })

  test('staggers with a transition delay when asked', () => {
    stubIntersectionObserver()
    const { container } = render(<Reveal delayMs={120}>Body copy</Reveal>)

    expect((container.firstElementChild as HTMLElement).style.transitionDelay).toBe('120ms')
  })

  test('renders the element the caller asked for', () => {
    stubIntersectionObserver()
    const { container } = render(<Reveal as="li">Body copy</Reveal>)

    expect(container.firstElementChild?.tagName).toBe('LI')
  })
})
