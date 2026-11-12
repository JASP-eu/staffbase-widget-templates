import { join } from 'node:path'
import { build } from 'vite'

import { ROOT, TEMPLATES } from './templates.ts'

// One self-contained IIFE file per template: Staffbase loads a widget from a single script URL.
for (const slug of TEMPLATES) {
  await build({
    root: ROOT,
    logLevel: 'warn',
    build: {
      outDir: join(ROOT, 'dist'),
      emptyOutDir: false,
      lib: {
        entry: join(ROOT, 'templates', slug, 'index.ts'),
        name: slug.replaceAll('-', '_'),
        formats: ['iife'],
        fileName: () => `${slug}.js`,
      },
    },
  })
  console.log(`built dist/${slug}.js`)
}
