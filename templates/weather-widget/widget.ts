import type { BaseBlock, BlockFactory, ExternalBlockDefinition } from '@staffbase/widget-sdk'

import { el, style } from '../../shared/dom.ts'
import { AUTHOR, VERSION } from '../../shared/version.ts'

export const NAME = 'tpl-weather-widget'

// WMO weather interpretation codes as used by Open-Meteo.
const CODES: [number[], string, string][] = [
  [[0], 'Clear sky', '☀️'],
  [[1, 2], 'Partly cloudy', '⛅'],
  [[3], 'Overcast', '☁️'],
  [[45, 48], 'Fog', '🌫️'],
  [[51, 53, 55, 56, 57], 'Drizzle', '🌦️'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Snow', '❄️'],
  [[95, 96, 99], 'Thunderstorm', '⛈️'],
]

export function describe(code: number): { text: string; icon: string } {
  const hit = CODES.find(([codes]) => codes.includes(code))
  return hit ? { text: hit[1], icon: hit[2] } : { text: 'Unknown', icon: '❔' }
}

export function forecastUrl(lat: number, lon: number, days: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: String(Math.min(7, Math.max(1, Math.round(days) || 3))),
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}

interface Forecast {
  current: { temperature_2m: number; weather_code: number }
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] }
}

const CSS = `
.tpl-wx{font-family:inherit;padding:12px}
.tpl-wx .now{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.tpl-wx .icon{font-size:2.4rem}
.tpl-wx .temp{font-size:1.8rem;font-weight:700}
.tpl-wx .days{display:flex;gap:6px}
.tpl-wx .day{flex:1;text-align:center;padding:6px;border-radius:8px;background:#f6f8fa;font-size:.85rem}
.tpl-wx .err{color:#cf222e}
`

const factory: BlockFactory = (Base) =>
  class WeatherWidget extends (Base as new () => BaseBlock) {
    renderBlock(container: HTMLElement): void {
      const root = el('div', { className: 'tpl-wx', text: 'Loading weather…' })
      container.replaceChildren(style(CSS), root)
      const location = this.getAttribute('location') || 'Weather'
      const rawLat = this.getAttribute('latitude')?.trim()
      const rawLon = this.getAttribute('longitude')?.trim()
      const lat = Number(rawLat)
      const lon = Number(rawLon)
      const days = Number(this.getAttribute('days')) || 3
      if (!rawLat || !rawLon || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        root.replaceChildren(el('div', { className: 'err', text: 'Set latitude and longitude in the widget settings.' }))
        return
      }
      void this.load(root, location, forecastUrl(lat, lon, days))
    }

    private async load(root: HTMLElement, location: string, url: string): Promise<void> {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as Forecast
        const now = describe(data.current.weather_code)
        const lang = document.documentElement.lang || undefined
        root.replaceChildren(
          el('div', { className: 'now' }, [
            el('span', { className: 'icon', text: now.icon }),
            el('div', {}, [
              el('div', { className: 'temp', text: `${Math.round(data.current.temperature_2m)} °C` }),
              el('div', { text: `${location} · ${now.text}` }),
            ]),
          ]),
          el(
            'div',
            { className: 'days' },
            data.daily.time.map((day, i) => {
              const d = describe(data.daily.weather_code[i] ?? -1)
              const label = new Date(`${day}T12:00:00`).toLocaleDateString(lang, { weekday: 'short' })
              const max = Math.round(data.daily.temperature_2m_max[i] ?? Number.NaN)
              const min = Math.round(data.daily.temperature_2m_min[i] ?? Number.NaN)
              return el('div', { className: 'day' }, [
                el('div', { text: label }),
                el('div', { text: d.icon }),
                el('div', { text: `${max}° / ${min}°` }),
              ])
            })
          )
        )
      } catch (error) {
        root.replaceChildren(
          el('div', {
            className: 'err',
            text: `Weather unavailable (${error instanceof Error ? error.message : 'error'})`,
          })
        )
      }
    }
  }

export const definition: ExternalBlockDefinition = {
  blockDefinition: {
    name: NAME,
    label: 'Weather (template)',
    blockLevel: 'block',
    factory,
    attributes: ['location', 'latitude', 'longitude', 'days'],
    configurationSchema: {
      type: 'object',
      required: ['latitude', 'longitude'],
      properties: {
        location: { type: 'string', title: 'Location name', default: 'Berlin' },
        latitude: { type: 'number', title: 'Latitude', default: 52.52 },
        longitude: { type: 'number', title: 'Longitude', default: 13.405 },
        days: { type: 'number', title: 'Forecast days (1–7)', default: 3, minimum: 1, maximum: 7 },
      },
    },
  },
  author: AUTHOR,
  version: VERSION,
}
