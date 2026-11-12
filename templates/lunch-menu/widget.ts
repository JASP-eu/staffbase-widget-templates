import type { BaseBlock, BlockFactory, ExternalBlockDefinition } from '@staffbase/widget-sdk'

import { el, style } from '../../shared/dom.ts'
import { AUTHOR, VERSION } from '../../shared/version.ts'

export const NAME = 'tpl-lunch-menu'

export interface Dish {
  day: number
  name: string
  allergens: string[]
}

// Accepts English and German day names so the menu text can be written in either language.
const DAYS: Record<string, number> = {
  mon: 1, mo: 1, monday: 1, montag: 1,
  tue: 2, di: 2, tuesday: 2, dienstag: 2,
  wed: 3, mi: 3, wednesday: 3, mittwoch: 3,
  thu: 4, do: 4, thursday: 4, donnerstag: 4,
  fri: 5, fr: 5, friday: 5, freitag: 5,
  sat: 6, sa: 6, saturday: 6, samstag: 6,
  sun: 0, so: 0, sunday: 0, sonntag: 0,
}

/** Parses "Day | Dish | Allergens" lines; lines with an unknown day are skipped. */
export function parseMenu(text: string): Dish[] {
  const dishes: Dish[] = []
  for (const line of text.split('\n')) {
    const [day, name, allergens] = line.split('|').map((p) => p.trim())
    const key = (day ?? '').toLowerCase()
    // hasOwn: a plain object would also answer "constructor" or "toString" with a function.
    const weekday = Object.hasOwn(DAYS, key) ? DAYS[key] : undefined
    if (weekday === undefined || !name) continue
    dishes.push({
      day: weekday,
      name,
      allergens: (allergens ?? '').split(/[,\s]+/).filter(Boolean),
    })
  }
  return dishes
}

const CSS = `
.tpl-lm{font-family:inherit;padding:12px}
.tpl-lm h3{margin:0 0 8px;font-size:1.1rem}
.tpl-lm .day{padding:8px;border-radius:8px;margin-bottom:6px;background:#f6f8fa}
.tpl-lm .day.today{background:var(--color-primary,#1f6feb);color:#fff}
.tpl-lm .dname{font-weight:600;font-size:.85rem;margin-bottom:2px}
.tpl-lm .al{font-size:.75rem;opacity:.8;margin-left:6px}
.tpl-lm .empty{opacity:.7}
`

const factory: BlockFactory = (Base) =>
  class LunchMenu extends (Base as new () => BaseBlock) {
    renderBlock(container: HTMLElement): void {
      const heading = this.getAttribute('heading') || 'Lunch menu'
      const todayOnly = this.getAttribute('todayonly') === 'true'
      const dishes = parseMenu(this.getAttribute('menu') ?? '')
      const today = new Date().getDay()
      const lang = document.documentElement.lang || undefined
      const dayName = (d: number): string =>
        // 2023-01-01 was a Sunday, so day d of that week has weekday d.
        new Date(2023, 0, 1 + d).toLocaleDateString(lang, { weekday: 'long' })

      const days = [...new Set(dishes.map((d) => d.day))]
        .filter((d) => !todayOnly || d === today)
        .toSorted((a, b) => ((a + 6) % 7) - ((b + 6) % 7))

      const root = el('div', { className: 'tpl-lm' }, [el('h3', { text: heading })])
      if (days.length === 0) root.append(el('div', { className: 'empty', text: 'No menu for today.' }))
      for (const d of days) {
        root.append(
          el('div', { className: d === today ? 'day today' : 'day' }, [
            el('div', { className: 'dname', text: dayName(d) }),
            ...dishes
              .filter((dish) => dish.day === d)
              .map((dish) =>
                el('div', {}, [
                  document.createTextNode(dish.name),
                  ...(dish.allergens.length
                    ? [el('span', { className: 'al', text: `(${dish.allergens.join(', ')})` })]
                    : []),
                ])
              ),
          ])
        )
      }
      container.replaceChildren(style(CSS), root)
    }
  }

export const definition: ExternalBlockDefinition = {
  blockDefinition: {
    name: NAME,
    label: 'Lunch Menu (template)',
    blockLevel: 'block',
    factory,
    attributes: ['heading', 'menu', 'todayonly'],
    configurationSchema: {
      type: 'object',
      properties: {
        heading: { type: 'string', title: 'Heading', default: 'Lunch menu' },
        menu: {
          type: 'string',
          title: 'Menu, one dish per line: Day | Dish | Allergens (e.g. Mon | Lasagne | A, C, G)',
          default:
            'Mon | Vegetable lasagne | A, C, G\nTue | Chicken curry with rice\nWed | Lentil soup | I\nThu | Fish and chips | A, D\nFri | Pizza Margherita | A, G',
        },
        todayonly: { type: 'boolean', title: "Show only today's dishes", default: false },
      },
    },
    uiSchema: { menu: { 'ui:widget': 'textarea' } },
  },
  author: AUTHOR,
  version: VERSION,
}
