import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import type { ExternalBlockDefinition } from '@staffbase/widget-sdk'

import { ROOT, TEMPLATES } from '../scripts/templates.ts'

// Smoke test for what Staffbase actually loads: each built file must call window.defineBlock once.
describe.each(TEMPLATES)('bundle dist/%s.js', (slug) => {
  it('registers a widget named tpl-<slug>', () => {
    const code = readFileSync(join(ROOT, 'dist', `${slug}.js`), 'utf8')
    const defineBlock = vi.fn<(d: ExternalBlockDefinition) => void>()
    window.defineBlock = defineBlock
    new Function(code)()
    expect(defineBlock).toHaveBeenCalledTimes(1)
    expect(defineBlock.mock.calls[0]?.[0].blockDefinition.name).toBe(`tpl-${slug}`)
  })

  it('has a README linking the live catalogue page', () => {
    const readme = readFileSync(join(ROOT, 'templates', slug, 'README.md'), 'utf8')
    expect(readme).toContain(`https://www.widgetbuilder.de/en/widgets/${slug}/`)
  })
})
