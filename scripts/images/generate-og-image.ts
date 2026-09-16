/**
 * npm run images:og [-- --url http://localhost:4173/]
 *
 * Genera public/og-image.png (1200×630) a partir del propio mapa: abre la app (npm run preview o
 * npm run dev), oculta la interfaz, superpone la marca y captura. Requiere el navegador de
 * Playwright (npx playwright install chromium).
 */
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { ROOT } from '../data/lib/dataset.ts'

const { values } = parseArgs({
  options: { url: { type: 'string', default: 'http://localhost:4173/' } },
})

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await context.addInitScript(() => window.sessionStorage.setItem('zibata:onboarding-visto', '1'))
  const page = await context.newPage()
  await page.goto(values.url)
  await page.waitForFunction(() => document.querySelectorAll('[data-mode]').length > 0, null, {
    timeout: 90_000,
  })
  await page.waitForTimeout(3000)

  await page.addStyleTag({
    content: `
      header, aside, fieldset, .maplibregl-ctrl-bottom-left { display: none !important; }
      #og-card { position: fixed; inset: 0; z-index: 100; pointer-events: none;
        background: linear-gradient(90deg, rgb(248 244 237 / 0.97) 0%, rgb(248 244 237 / 0.9) 34%, rgb(248 244 237 / 0) 62%); }
      #og-card .inner { position: absolute; left: 64px; top: 50%; translate: 0 -50%; width: 440px; color: #1f2419; font-family: 'Instrument Sans', sans-serif; }
      #og-card .eyebrow { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #536c2a; }
      #og-card h1 { margin: 18px 0 14px; font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 92px; line-height: .92; letter-spacing: -.02em; }
      #og-card p { margin: 0; font-size: 24px; line-height: 1.35; color: #454a3b; }
    `,
  })
  await page.evaluate(() => {
    const card = document.createElement('div')
    card.id = 'og-card'
    card.innerHTML = `<div class="inner">
      <div class="eyebrow"><svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#536c2a"/><path d="M16 6.5 26 12v8.4L16 26 6 20.4V12z" fill="#8cba37"/><path d="M16 6.5 26 12l-10 5.6L6 12z" fill="#b8d77c"/><path d="M16 17.6V26l10-5.6V12z" fill="#6a8736"/></svg>Comer y beber</div>
      <h1>Zibatá</h1>
      <p>Explora el mapa 3D y descubre en qué plazas desayunar, comer, tomar café o salir por la noche.</p>
    </div>`
    document.body.append(card)
  })
  await page.evaluate(() => document.fonts.ready)
  const shot = await page.screenshot({ type: 'png' })
  await sharp(shot)
    .png({ compressionLevel: 9, palette: false })
    .toFile(`${ROOT}public/og-image.png`)
  console.log('✓ public/og-image.png')
} finally {
  await browser.close()
}
