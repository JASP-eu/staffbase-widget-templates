import { afterEach, describe, expect, it, vi } from 'vitest'

import { definition, describe as describeCode, forecastUrl } from '../templates/weather-widget/widget.ts'
import { jsonResponse, mount } from './harness.ts'

const FORECAST = {
  current: { temperature_2m: 18.4, weather_code: 2 },
  daily: {
    time: ['2027-06-01', '2027-06-02'],
    weather_code: [0, 61],
    temperature_2m_max: [21.2, 17.8],
    temperature_2m_min: [11.1, 9.6],
  },
}

describe('weather-widget', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('builds the Open-Meteo URL and clamps forecast days', () => {
    const url = new URL(forecastUrl(52.52, 13.405, 12))
    expect(url.origin).toBe('https://api.open-meteo.com')
    expect(url.searchParams.get('forecast_days')).toBe('7')
    expect(describeCode(61).text).toBe('Rain')
    expect(describeCode(1234).text).toBe('Unknown')
  })

  it('renders current weather and the daily forecast', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(FORECAST))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = mount(definition, { location: 'Berlin', latitude: '52.52', longitude: '13.405', days: '2' })
    await vi.waitFor(() => expect(container.querySelector('.temp')?.textContent).toBe('18 °C'))
    expect(container.textContent).toContain('Berlin · Partly cloudy')
    expect(container.querySelectorAll('.day')).toHaveLength(2)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('forecast_days=2')
  })

  it('shows an error when the forecast request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)))
    const { container } = mount(definition, { latitude: '52.52', longitude: '13.405' })
    await vi.waitFor(() => expect(container.querySelector('.err')?.textContent).toBe('Weather unavailable (HTTP 503)'))
  })

  it('asks for coordinates instead of fetching when they are missing', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = mount(definition, { location: 'Nowhere' })
    expect(container.querySelector('.err')?.textContent).toContain('latitude')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
