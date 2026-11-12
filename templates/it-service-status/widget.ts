import type { BaseBlock, BlockFactory, ExternalBlockDefinition } from '@staffbase/widget-sdk'

import { el, style } from '../../shared/dom.ts'
import { AUTHOR, VERSION } from '../../shared/version.ts'

export const NAME = 'tpl-it-service-status'

export const LEVELS = ['operational', 'maintenance', 'degraded', 'outage'] as const
export type Level = (typeof LEVELS)[number]
export interface Service {
  name: string
  status: Level
}

const LABEL: Record<Level, string> = {
  operational: 'Operational',
  maintenance: 'Maintenance',
  degraded: 'Degraded',
  outage: 'Outage',
}
const COLOR: Record<Level, string> = {
  operational: '#1a7f37',
  maintenance: '#0969da',
  degraded: '#bf8700',
  outage: '#cf222e',
}

function toLevel(value: unknown): Level {
  const v = String(value ?? '').trim().toLowerCase()
  return (LEVELS as readonly string[]).includes(v) ? (v as Level) : 'degraded'
}

/** Parses "Name | status" lines; unknown status words count as degraded so a typo never shows green. */
export function parseServices(text: string): Service[] {
  return text
    .split('\n')
    .map((line) => line.split('|'))
    .filter(([name]) => name?.trim())
    .map(([name, status]) => ({ name: name!.trim(), status: toLevel(status) }))
}

/** Accepts `[{ "name": "...", "status": "..." }]` from a status endpoint. */
export function parseServiceJson(data: unknown): Service[] {
  if (!Array.isArray(data)) throw new Error('Status endpoint must return a JSON array')
  return data
    .filter((s): s is { name: unknown; status: unknown } => typeof s === 'object' && s !== null && 'name' in s)
    .map((s) => ({ name: String(s.name), status: toLevel(s.status) }))
}

/** The worst level wins the banner. */
export function overall(services: Service[]): Level {
  return services.reduce<Level>(
    (worst, s) => (LEVELS.indexOf(s.status) > LEVELS.indexOf(worst) ? s.status : worst),
    'operational'
  )
}

const CSS = `
.tpl-st{font-family:inherit;padding:12px}
.tpl-st .banner{padding:10px 12px;border-radius:8px;color:#fff;font-weight:600;margin-bottom:8px}
.tpl-st ul{list-style:none;margin:0;padding:0}
.tpl-st li{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid #d0d7de}
.tpl-st .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.tpl-st .err{color:#cf222e;font-size:.85rem}
`

const factory: BlockFactory = (Base) =>
  class ItServiceStatus extends (Base as new () => BaseBlock) {
    private timer: ReturnType<typeof setInterval> | undefined
    private generation = 0

    renderBlock(container: HTMLElement): void {
      this.stop()
      const root = el('div', { className: 'tpl-st' })
      container.replaceChildren(style(CSS), root)
      const url = this.getAttribute('statusurl')?.trim()
      const draw = (services: Service[], error?: string): void => {
        const worst = overall(services)
        root.replaceChildren(
          el('div', {
            className: 'banner',
            text: worst === 'operational' ? 'All systems operational' : `Some systems: ${LABEL[worst]}`,
            style: { background: COLOR[worst] },
          }),
          el(
            'ul',
            {},
            services.map((s) =>
              el('li', {}, [
                el('span', { text: s.name }),
                el('span', {}, [
                  el('span', { className: 'dot', style: { background: COLOR[s.status] } }),
                  document.createTextNode(LABEL[s.status]),
                ]),
              ])
            )
          )
        )
        if (error) root.append(el('div', { className: 'err', text: error }))
      }

      const fallback = parseServices(this.getAttribute('services') ?? '')
      draw(fallback)
      if (!url) return

      let latest = 0
      const generation = this.generation
      const load = async (): Promise<void> => {
        // A slow response must not overwrite a newer one, nor draw after unmount or re-render.
        const request = ++latest
        const current = (): boolean => request === latest && generation === this.generation
        try {
          const res = await fetch(url, { headers: { accept: 'application/json' } })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const services = parseServiceJson(await res.json())
          if (current()) draw(services)
        } catch (error) {
          if (current()) draw(fallback, `Live status unavailable (${error instanceof Error ? error.message : 'error'})`)
        }
      }
      void load()
      const seconds = Math.max(30, Number(this.getAttribute('refreshseconds')) || 60)
      this.timer = setInterval(() => void load(), seconds * 1000)
    }

    unmountBlock(): void {
      this.stop()
    }

    private stop(): void {
      this.generation++
      if (this.timer !== undefined) clearInterval(this.timer)
      this.timer = undefined
    }
  }

export const definition: ExternalBlockDefinition = {
  blockDefinition: {
    name: NAME,
    label: 'IT Service Status (template)',
    blockLevel: 'block',
    factory,
    attributes: ['services', 'statusurl', 'refreshseconds'],
    configurationSchema: {
      type: 'object',
      properties: {
        services: {
          type: 'string',
          title: 'Services, one per line: Name | operational, maintenance, degraded or outage',
          default: 'E-mail | operational\nVPN | operational\nHR portal | maintenance',
        },
        statusurl: {
          type: 'string',
          title: 'Optional JSON endpoint ([{"name": "...", "status": "..."}]); must allow CORS',
        },
        refreshseconds: { type: 'number', title: 'Refresh interval in seconds (min. 30)', default: 60 },
      },
    },
    uiSchema: { services: { 'ui:widget': 'textarea' } },
  },
  author: AUTHOR,
  version: VERSION,
}
