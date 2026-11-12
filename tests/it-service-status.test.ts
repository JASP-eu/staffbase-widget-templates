import { afterEach, describe, expect, it, vi } from 'vitest'

import { definition, overall, parseServiceJson, parseServices } from '../templates/it-service-status/widget.ts'
import { jsonResponse, mount } from './harness.ts'

describe('it-service-status', () => {
  afterEach(() => vi.unstubAllGlobals())

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
})
