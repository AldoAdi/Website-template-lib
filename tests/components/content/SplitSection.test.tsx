import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SplitSection } from '../../../src/components/content/SplitSection'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('SplitSection', () => {
  test('renders the media slot and the prose together', () => {
    render(
      <SplitSection media={<img alt="Reception" src="/reception.jpg" />} ariaLabel="About us">
        <p>Body copy.</p>
      </SplitSection>,
    )

    expect(screen.getByRole('img', { name: 'Reception' })).toBeDefined()
    expect(screen.getByText('Body copy.')).toBeDefined()
  })

  test('becomes a named region only when it is given a name', () => {
    const { unmount } = render(
      <SplitSection media={<div />} ariaLabel="Advanced technology">
        <p>Body.</p>
      </SplitSection>,
    )
    expect(screen.getByRole('region', { name: 'Advanced technology' })).toBeDefined()

    unmount()
    render(
      <SplitSection media={<div />}>
        <p>Body.</p>
      </SplitSection>,
    )

    expect(screen.queryByRole('region')).toBeNull()
  })

  test('keeps the media first in source order whichever side it is shown on', () => {
    const { container } = render(
      <SplitSection media={<img alt="Doctor" src="/doctor.jpg" />} mediaSide="end">
        <p>Body copy.</p>
      </SplitSection>,
    )

    const first = container.querySelectorAll('section > div > div')[0] as HTMLElement

    expect(first.querySelector('img')).not.toBeNull()
  })

  test('flips the media to the far side visually without reordering the DOM', () => {
    const { container } = render(
      <SplitSection media={<img alt="Doctor" src="/doctor.jpg" />} mediaSide="end">
        <p>Body copy.</p>
      </SplitSection>,
    )

    expect(container.querySelector('.md\\:order-2')).not.toBeNull()
  })

  test('has no axe violations', async () => {
    const { container } = render(
      <SplitSection media={<img alt="Doctor" src="/doctor.jpg" />} ariaLabel="Meet the doctor">
        <h2>Dr Reyes</h2>
        <p>Body copy.</p>
      </SplitSection>,
    )

    expect(await findAxeViolations(container)).toEqual([])
  })
})
