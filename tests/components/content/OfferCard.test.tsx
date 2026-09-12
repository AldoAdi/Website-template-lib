import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { OfferCard } from '../../../src/components/content/OfferCard'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('OfferCard', () => {
  test('renders the offer as a heading at the given level', () => {
    render(<OfferCard title="$75 cleaning, exam & X-ray" terms="New patients only." />)

    expect(screen.getByRole('heading', { level: 3, name: /\$75 cleaning/i })).toBeDefined()
  })

  test('honours a caller-chosen heading level so a page can keep its order', () => {
    render(<OfferCard title="$29 emergency exam" terms="Excludes treatment." headingLevel="h4" />)

    expect(screen.getByRole('heading', { level: 4 })).toBeDefined()
  })

  test('always renders the terms -- the small print is part of the offer', () => {
    render(<OfferCard title="$75 cleaning" terms="Excludes periodontal treatment." />)

    expect(screen.getByText('Excludes periodontal treatment.')).toBeDefined()
  })

  test('renders the eyebrow and body when given', () => {
    render(
      <OfferCard
        eyebrow="New patient offer"
        title="$75 cleaning"
        body="Includes a full set of X-rays."
        terms="New patients only."
      />,
    )

    expect(screen.getByText('New patient offer')).toBeDefined()
    expect(screen.getByText('Includes a full set of X-rays.')).toBeDefined()
  })

  test('renders a caller-supplied action so the offer can be tracked', () => {
    render(
      <OfferCard
        title="$75 cleaning"
        terms="New patients only."
        actionSlot={<a href="/book">Claim offer</a>}
      />,
    )

    expect(screen.getByRole('link', { name: 'Claim offer' }).getAttribute('href')).toBe('/book')
  })

  test('has no axe violations', async () => {
    const { container } = render(
      <OfferCard eyebrow="Offer" title="$75 cleaning" terms="New patients only." />,
    )

    expect(await findAxeViolations(container)).toEqual([])
  })
})
