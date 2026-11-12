import { afterEach, describe, expect, it, vi } from 'vitest'

import { definition, remaining } from '../templates/countdown-timer/widget.ts'
import { mount } from './harness.ts'

describe('countdown-timer', () => {
  afterEach(() => vi.useRealTimers())

  it('splits the remaining time into units', () => {
    const now = new Date('2027-01-01T00:00:00Z')
    expect(remaining(new Date('2027-01-02T01:02:03Z'), now)).toEqual({
      days: 1, hours: 1, minutes: 2, seconds: 3, done: false,
    })
    expect(remaining(new Date('2026-12-31T00:00:00Z'), now).done).toBe(true)
    expect(remaining(new Date('not a date'), now).done).toBe(true)
  })

  it('renders and ticks down, then shows the done text', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
    const { container, element } = mount(definition, {
      heading: 'Launch',
      target: '2027-01-01T00:00:02Z',
      donetext: 'Live!',
    })
    expect(container.querySelector('h3')?.textContent).toBe('Launch')
    expect(container.querySelectorAll('.num')[3]?.textContent).toBe('02')
    vi.advanceTimersByTime(1000)
    expect(container.querySelectorAll('.num')[3]?.textContent).toBe('01')
    vi.advanceTimersByTime(1000)
    expect(container.querySelector('.done')?.textContent).toBe('Live!')
    element.unmountBlock(container)
  })
})
