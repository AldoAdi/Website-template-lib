import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { Carousel } from '../../../src/components/content/Carousel'
import { fakeScrollMetrics, stubResizeObserver } from '../../browserStubs'
import { findAxeViolations } from '../../axeHelpers'

const ITEMS = [<p key="a">First</p>, <p key="b">Second</p>, <p key="c">Third</p>]

beforeEach(() => {
  stubResizeObserver()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Carousel', () => {
  test('renders every slide as a list item, keeping the count announceable', () => {
    render(<Carousel items={ITEMS} label="Patient reviews" />)

    const track = screen.getByRole('list', { name: 'Patient reviews' })

    expect(track.querySelectorAll('li')).toHaveLength(3)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  test('makes the scrollable track reachable by keyboard', () => {
    render(<Carousel items={ITEMS} label="Patient reviews" />)

    const track = screen.getByRole('list', { name: 'Patient reviews' })
    track.focus()

    expect(track.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(track)
  })

  test('does not claim the ARIA carousel pattern it does not implement', () => {
    const { container } = render(<Carousel items={ITEMS} label="Patient reviews" />)

    expect(container.querySelector('[aria-roledescription]')).toBeNull()
  })

  test('disables both buttons when the track does not overflow', () => {
    render(<Carousel items={ITEMS} label="Patient reviews" />)

    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  })

  test('enables Next once there is somewhere further to scroll', () => {
    render(<Carousel items={ITEMS} label="Patient reviews" />)

    const track = screen.getByRole('list', { name: 'Patient reviews' })
    fakeScrollMetrics(track, { scrollLeft: 0, clientWidth: 300, scrollWidth: 900 })
    act(() => {
      fireEvent.scroll(track)
    })

    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
  })

  test('scrolls one viewport of slides per activation', () => {
    render(<Carousel items={ITEMS} label="Patient reviews" />)

    const track = screen.getByRole('list', { name: 'Patient reviews' })
    fakeScrollMetrics(track, { scrollLeft: 0, clientWidth: 300, scrollWidth: 900 })
    const scrollBy = vi.fn()
    track.scrollBy = scrollBy as unknown as typeof track.scrollBy
    act(() => {
      fireEvent.scroll(track)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(scrollBy).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
  })

  test('treats a near-miss of the far edge as the end, not as more to scroll', () => {
    render(<Carousel items={ITEMS} label="Patient reviews" />)

    const track = screen.getByRole('list', { name: 'Patient reviews' })
    // 897 of a possible 900 - 300 = 600 is impossible; use a realistic
    // sub-pixel shortfall against the true maximum instead.
    fakeScrollMetrics(track, { scrollLeft: 598, clientWidth: 300, scrollWidth: 900 })
    act(() => {
      fireEvent.scroll(track)
    })

    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  })

  test('accepts translated button labels', () => {
    render(<Carousel items={ITEMS} label="Reviews" previousLabel="Zurück" nextLabel="Weiter" />)

    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDefined()
  })

  test('has no axe violations', async () => {
    const { container } = render(<Carousel items={ITEMS} label="Patient reviews" />)

    expect(await findAxeViolations(container)).toEqual([])
  })
})
