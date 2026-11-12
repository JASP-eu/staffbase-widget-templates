import { afterEach, describe, expect, it, vi } from 'vitest'

import { definition, overall, parseServiceJson, parseServices } from '../templates/it-service-status/widget.ts'
import { jsonResponse, mount } from './harness.ts'

describe('it-service-status', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('parses lines and treats unknown status as degraded', () => {
    expect(parseServices('Mail | operational\nVPN | broken\n\n')).toEqual([
      { name: 'Mail', status: 'operational' },
      { name: 'VPN', status: 'degraded' },
    ])
    expect(overall([{ name: 'a', status: 'maintenance' }, { name: 'b', status: 'outage' }])).toBe('outage')
    expect(overall([])).toBe('operational')
    expect(() => parseServiceJson({})).toThrow()
  })

  it('renders static services with the worst status in the banner', () => {
    const { container } = mount(definition, { services: 'Mail | operational\nVPN | outage' })
    expect(container.querySelector('.banner')?.textContent).toBe('Some systems: Outage')
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  it('loads live status and falls back with a message on error', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([{ name: 'Wiki', status: 'operational' }]))
    vi.stubGlobal('fetch', fetchMock)
    const { container, element } = mount(definition, {
      services: 'Mail | outage',
      statusurl: 'https://status.example.com/api.json',
    })
    await vi.waitFor(() => expect(container.querySelector('li')?.textContent).toContain('Wiki'))
    expect(container.querySelector('.banner')?.textContent).toBe('All systems operational')
    element.unmountBlock(container)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))
    const second = mount(definition, { services: 'Mail | outage', statusurl: 'https://status.example.com/x' })
    await vi.waitFor(() => expect(second.container.querySelector('.err')?.textContent).toContain('HTTP 500'))
    expect(second.container.querySelector('li')?.textContent).toContain('Mail')
    second.element.unmountBlock(second.container)
  })

  it('stops polling on unmount and keeps one timer across re-renders', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const { container, element } = mount(definition, { statusurl: 'https://status.example.com/a', refreshseconds: '30' })
    element.renderBlock(container)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    element.unmountBlock(container)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('ignores a slow poll response once a newer poll has answered', async () => {
    vi.useFakeTimers()
    let releaseSlow: ((r: Response) => void) | undefined
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (releaseSlow = resolve)))
      .mockResolvedValueOnce(jsonResponse([{ name: 'New', status: 'operational' }]))
    vi.stubGlobal('fetch', fetchMock)
    const { container, element } = mount(definition, { statusurl: 'https://status.example.com/a', refreshseconds: '30' })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(container.querySelector('li')?.textContent).toContain('New')
    releaseSlow?.(jsonResponse([{ name: 'Old', status: 'outage' }]))
    await vi.advanceTimersByTimeAsync(0)
    expect(container.querySelector('li')?.textContent).toContain('New')
    element.unmountBlock(container)
  })

  it('does not draw a response that arrives after unmount', async () => {
    let release: ((r: Response) => void) | undefined
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (release = resolve))))
    const { container, element } = mount(definition, { services: 'Mail | outage', statusurl: 'https://status.example.com/a' })
    element.unmountBlock(container)
    const before = container.innerHTML
    release?.(jsonResponse([{ name: 'Late', status: 'operational' }]))
    await new Promise((r) => setTimeout(r, 0))
    expect(container.innerHTML).toBe(before)
  })
})
