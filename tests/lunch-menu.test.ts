import { afterEach, describe, expect, it, vi } from 'vitest'

import { definition, parseMenu } from '../templates/lunch-menu/widget.ts'
import { mount } from './harness.ts'

const MENU = 'Mon | Lasagne | A, C, G\nDi | Curry\nFri | Pizza | A\nFunday | Cake'

describe('lunch-menu', () => {
  afterEach(() => vi.useRealTimers())

  it('parses English and German day names and skips unknown days', () => {
    expect(parseMenu(MENU)).toEqual([
      { day: 1, name: 'Lasagne', allergens: ['A', 'C', 'G'] },
      { day: 2, name: 'Curry', allergens: [] },
      { day: 5, name: 'Pizza', allergens: ['A'] },
    ])
  })

  it('renders the week in order and highlights today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-06-01T10:00:00')) // a Tuesday
    const { container } = mount(definition, { heading: 'Canteen', menu: MENU })
    expect(container.querySelector('h3')?.textContent).toBe('Canteen')
    expect(container.querySelectorAll('.day')).toHaveLength(3)
    expect(container.querySelector('.today')?.textContent).toContain('Curry')
    expect(container.textContent).toContain('(A, C, G)')
  })

  it('shows only today when configured', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-06-05T10:00:00')) // a Saturday
    const { container } = mount(definition, { menu: MENU, todayonly: 'true' })
    expect(container.querySelector('.empty')?.textContent).toBe('No menu for today.')
  })
})
