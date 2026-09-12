import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Prose } from '../../../src/components/content/Prose'

afterEach(() => {
  cleanup()
})

describe('Prose', () => {
  test('renders its children unchanged, adding no markup of its own', () => {
    render(
      <Prose>
        <h2>What to expect</h2>
        <p>Body copy.</p>
      </Prose>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'What to expect' })).toBeDefined()
    expect(screen.getByText('Body copy.')).toBeDefined()
  })

  test('styles using only token-bound utilities, never a hardcoded hex color', () => {
    const { container } = render(
      <Prose>
        <p>Body.</p>
      </Prose>,
    )

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  test('appends caller classes rather than replacing its own', () => {
    const { container } = render(
      <Prose className="mt-8">
        <p>Body.</p>
      </Prose>,
    )

    const wrapper = container.firstElementChild as HTMLElement

    expect(wrapper.className).toContain('mt-8')
    expect(wrapper.className).toContain('max-w-2xl')
  })
})
