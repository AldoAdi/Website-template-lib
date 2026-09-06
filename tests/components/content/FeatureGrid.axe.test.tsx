import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FeatureGrid } from '../../../src/components/content/FeatureGrid'
import { Card } from '../../../src/components/content/Card'
import { findAxeViolations } from '../../axeHelpers'

afterEach(() => {
  cleanup()
})

describe('FeatureGrid + Card accessibility', () => {
  test('has no axe violations with several linked cards and icons', async () => {
    const { container } = render(
      <FeatureGrid>
        <Card
          icon={<svg aria-hidden="true" />}
          title="Fast"
          body="Ships in minutes."
          href="/features/fast"
        />
        <Card
          icon={<svg aria-hidden="true" />}
          title="Secure"
          body="Encrypted by default."
          href="/features/secure"
        />
        <Card
          icon={<svg aria-hidden="true" />}
          title="Simple"
          body="No configuration required."
          href="/features/simple"
        />
      </FeatureGrid>,
    )

    const violations = await findAxeViolations(container)

    expect(violations).toEqual([])
  })

  test('has no axe violations when cards have no link or icon', async () => {
    const { container } = render(
      <FeatureGrid>
        <Card title="Fast" body="Ships in minutes." />
        <Card title="Secure" body="Encrypted by default." />
      </FeatureGrid>,
    )

    const violations = await findAxeViolations(container)

    expect(violations).toEqual([])
  })
})
