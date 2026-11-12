import type { BaseBlock, BlockFactory, ExternalBlockDefinition } from '@staffbase/widget-sdk'

import { el, style } from '../../shared/dom.ts'
import { AUTHOR, VERSION } from '../../shared/version.ts'

export const NAME = 'tpl-countdown-timer'

export interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

/** Splits the time left until `target` into units; `done` once the target has passed or is invalid. */
export function remaining(target: Date, now: Date): Remaining {
  const ms = target.getTime() - now.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  const total = Math.floor(ms / 1000)
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: false,
  }
}

const CSS = `
.tpl-cd{font-family:inherit;text-align:center;padding:16px}
.tpl-cd h3{margin:0 0 12px;font-size:1.1rem}
.tpl-cd .units{display:flex;gap:8px;justify-content:center}
.tpl-cd .unit{min-width:64px;padding:10px 6px;border-radius:8px;background:var(--color-primary,#1f6feb);color:#fff}
.tpl-cd .num{display:block;font-size:1.6rem;font-weight:700;font-variant-numeric:tabular-nums}
.tpl-cd .lbl{font-size:.75rem;opacity:.85}
.tpl-cd .done{font-size:1.3rem;font-weight:600}
`

const factory: BlockFactory = (Base) =>
  class CountdownTimer extends (Base as new () => BaseBlock) {
    private timer: ReturnType<typeof setInterval> | undefined

    renderBlock(container: HTMLElement): void {
      this.stop()
      const title = this.getAttribute('heading') ?? ''
      const target = new Date(this.getAttribute('target') ?? '')
      const doneText = this.getAttribute('donetext') || "It's here!"

      const root = el('div', { className: 'tpl-cd' })
      const units = el('div', { className: 'units' })
      container.replaceChildren(style(CSS), root)
      if (title) root.append(el('h3', { text: title }))
      root.append(units)

      const tick = (): void => {
        const left = remaining(target, new Date())
        if (left.done) {
          units.replaceChildren(el('div', { className: 'done', text: doneText }))
          this.stop()
          return
        }
        units.replaceChildren(
          ...(
            [
              [left.days, 'days'],
              [left.hours, 'hours'],
              [left.minutes, 'minutes'],
              [left.seconds, 'seconds'],
            ] as const
          ).map(([n, label]) =>
            el('div', { className: 'unit' }, [
              el('span', { className: 'num', text: String(n).padStart(2, '0') }),
              el('span', { className: 'lbl', text: label }),
            ])
          )
        )
      }
      tick()
      if (!remaining(target, new Date()).done) this.timer = setInterval(tick, 1000)
    }

    unmountBlock(): void {
      this.stop()
    }

    private stop(): void {
      if (this.timer !== undefined) clearInterval(this.timer)
      this.timer = undefined
    }
  }

export const definition: ExternalBlockDefinition = {
  blockDefinition: {
    name: NAME,
    label: 'Countdown Timer (template)',
    blockLevel: 'block',
    factory,
    attributes: ['heading', 'target', 'donetext'],
    configurationSchema: {
      type: 'object',
      required: ['target'],
      properties: {
        heading: { type: 'string', title: 'Heading', default: 'Summer party' },
        target: { type: 'string', title: 'Target date and time (ISO 8601, e.g. 2027-06-30T17:00:00+02:00)' },
        donetext: { type: 'string', title: 'Text after the countdown ends', default: "It's here!" },
      },
    },
  },
  author: AUTHOR,
  version: VERSION,
}
