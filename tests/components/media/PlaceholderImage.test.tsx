import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { PlaceholderImage } from '../../../src/components/media/PlaceholderImage'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('PlaceholderImage', () => {
  test('loads nothing -- no img element and no remote request', () => {
    const { container } = render(<PlaceholderImage label="Reception area" />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('http')
  })

  test('is hidden from assistive technology, because a placeholder conveys nothing', () => {
    const { container } = render(<PlaceholderImage label="Reception area" />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })

  test('reserves the space the real photograph will occupy', () => {
    const { container } = render(<PlaceholderImage label="Reception area" aspect="16 / 9" />)
    const element = container.firstElementChild as HTMLElement

    expect(element.style.aspectRatio).toBe('16 / 9')
  })

  test('defaults to a 4 / 3 box', () => {
    const { container } = render(<PlaceholderImage label="Reception area" />)
    const element = container.firstElementChild as HTMLElement

    expect(element.style.aspectRatio).toBe('4 / 3')
  })

  test('shows the label, so whoever replaces it knows what to shoot', () => {
    const { container } = render(<PlaceholderImage label="Dr Reyes, portrait" />)

    expect(container.textContent).toBe('Dr Reyes, portrait')
  })

  test('has no axe violations', async () => {
    render(
      <main>
        <PlaceholderImage label="Reception area" />
      </main>,
    )

    expect(await findAxeViolations(document.body)).toEqual([])
  })
})
