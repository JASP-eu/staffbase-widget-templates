import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

import { ROOT, TEMPLATES } from './templates.ts'

// Example settings per template; the weather screenshot uses live Open-Meteo data.
const ATTRIBUTES: Record<string, Record<string, string>> = {
  'countdown-timer': { heading: 'Summer party', target: new Date(Date.now() + 12 * 86_400_000 + 5 * 3_600_000).toISOString() },
  'it-service-status': { services: 'E-mail | operational\nVPN | operational\nHR portal | maintenance\nPrinting | degraded' },
  'weather-widget': { location: 'Berlin', latitude: '52.52', longitude: '13.405', days: '5' },
  'lunch-menu': {
    heading: 'Lunch menu',
    menu: 'Mon | Vegetable lasagne | A, C, G\nTue | Chicken curry with rice\nWed | Lentil soup | I\nThu | Fish and chips | A, D\nFri | Pizza Margherita | A, G',
  },
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: 460, height: 400 }, deviceScaleFactor: 2 })
for (const slug of TEMPLATES) {
  const url = pathToFileURL(join(ROOT, 'demo', 'host.html'))
  url.search = `t=${slug}`
  url.hash = encodeURIComponent(JSON.stringify(ATTRIBUTES[slug] ?? {}))
  await page.goto(url.href)
  await page.waitForTimeout(1500)
  await page.locator('#slot').screenshot({ path: join(ROOT, 'templates', slug, 'screenshot.png') })
  console.log(`templates/${slug}/screenshot.png`)
}
await browser.close()
