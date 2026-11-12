import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = join(import.meta.dirname, '..')

/** Every folder under templates/ is one widget; its slug matches the widgetbuilder.de catalogue page. */
export const TEMPLATES = readdirSync(join(ROOT, 'templates'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .toSorted()
