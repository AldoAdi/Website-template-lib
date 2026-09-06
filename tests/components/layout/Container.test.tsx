import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Container } from '../../../src/components/layout/Container'

afterEach(() => {
  cleanup()
})

describe('Container', () => {
  test('renders its children', () => {
    render(
      <Container>
        <p>content</p>
      </Container>,
    )

    expect(screen.getByText('content')).toBeDefined()
  })

  test('styles using only token-bound utility classes, never a hardcoded hex color', () => {
    render(
      <Container>
        <p>content</p>
      </Container>,
    )

    const wrapper = screen.getByText('content').parentElement
    expect(wrapper?.className).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  test('appends a caller-supplied className to its own base classes', () => {
    render(
      <Container className="extra-class">
        <p>content</p>
      </Container>,
    )

    const wrapper = screen.getByText('content').parentElement
    expect(wrapper?.className).toContain('extra-class')
    expect(wrapper?.className).toContain('mx-auto')
  })
})
