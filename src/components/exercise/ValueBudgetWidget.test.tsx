import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValueBudgetWidget } from './ValueBudgetWidget'

describe('ValueBudgetWidget', () => {
  it('renders Spent and Remaining', () => {
    render(<ValueBudgetWidget budget={100000} spent={5000} />)
    expect(screen.getByText(/spent/i)).toBeInTheDocument()
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()
    expect(screen.getByText('$5,000')).toBeInTheDocument()
    expect(screen.getByText('$95,000')).toBeInTheDocument()
  })

  it('marks state as "in-progress" when 0 < remaining < budget', () => {
    const { container } = render(<ValueBudgetWidget budget={100000} spent={5000} />)
    expect(container.querySelector('[data-state="in-progress"]')).toBeTruthy()
  })

  it('marks state as "perfect" when remaining is exactly 0', () => {
    const { container } = render(<ValueBudgetWidget budget={100000} spent={100000} />)
    expect(container.querySelector('[data-state="perfect"]')).toBeTruthy()
  })

  it('marks state as "over-budget" when remaining is negative', () => {
    const { container } = render(<ValueBudgetWidget budget={100000} spent={120000} />)
    expect(container.querySelector('[data-state="over-budget"]')).toBeTruthy()
  })
})
