import { expect, type Page, test } from '@playwright/test'
import { openApp, panel, plazaMarker, waitForMap } from './helpers.ts'

/**
 * Plazas representadas en pantalla: marcadores visibles dentro de la vista más las plazas anunciadas en
 * un grupo "+N" (las que no caben junto a otras en pantallas pequeñas).
 */
const representedPlazas = (page: Page) =>
  page.evaluate(() => {
    const inView = (element: Element) => {
      const box = element.getBoundingClientRect()
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
    }
    const markers = [...document.querySelectorAll<HTMLElement>('button[data-mode]')].filter(
      (marker) => marker.dataset.mode !== 'hidden' && inView(marker),
    )
    const grouped = [...document.querySelectorAll('button[aria-label^="Acercar el mapa"]')]
      .filter(inView)
      .reduce((sum, badge) => sum + Number(badge.textContent?.replace('+', '') ?? 0), 0)
    return markers.length + grouped
  })

/** Marcadores y grupos "+N" mostrados que quedan (en parte) bajo la hoja inferior, que solo existe en móvil. */
const coveredBySheet = (page: Page) =>
  page.evaluate(() => {
    const sheet = document.querySelector('section[data-panel]')?.getBoundingClientRect()
    if (!sheet) return []
    return [
      ...document.querySelectorAll<HTMLElement>(
        'button[data-mode], button[aria-label^="Acercar el mapa"]',
      ),
    ]
      .filter(
        (element) =>
          element.dataset.mode !== 'hidden' && element.getBoundingClientRect().bottom > sheet.top,
      )
      .map((element) => element.getAttribute('aria-label'))
  })

/** Nº de plazas activas según el selector de plazas (sin la opción "Todas"). */
const activePlazaCount = async (page: Page) =>
  (await page.getByRole('combobox', { name: 'Plaza' }).locator('option').count()) - 1

test.describe('Mapa', () => {
  test('abre directamente en el mapa 3D con plazas y atribución', async ({ page }) => {
    await openApp(page)
    await expect(page).toHaveTitle(/Zibatá/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Zibatá · Comer y beber' }),
    ).toBeAttached()
    const canvas = page.locator('canvas.maplibregl-canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveAttribute('aria-label', 'Mapa 3D interactivo de Zibatá')
    await waitForMap(page)
    // Qué plazas llevan marcador propio depende del tamaño de pantalla; alguna siempre lo tiene.
    await expect(
      page.getByRole('button', { name: /^Ver .+: \d+ lugar(es)?$/ }).first(),
    ).toBeVisible()
    await expect((await plazaMarker(page, 'Xentric Anáhuac')).first()).toHaveAccessibleName(
      'Ver Xentric Anáhuac: 20 lugares',
    )
    await expect(
      page.locator('.maplibregl-ctrl-attrib a', { hasText: 'OpenStreetMap' }),
    ).toBeAttached()
  })

  test('muestra el tutorial en la primera visita, se puede recorrer y no se repite en la sesión', async ({
    page,
  }) => {
    await openApp(page, { onboarding: true })
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Explora Zibatá' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Siguiente' }).click()
    await expect(dialog.getByRole('heading', { name: 'Selecciona una plaza' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Siguiente' }).click()
    await expect(
      dialog.getByRole('heading', { name: 'Descubre dónde comer y beber' }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Empezar a explorar' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await waitForMap(page)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('el tutorial se puede saltar', async ({ page }) => {
    await openApp(page, { onboarding: true })
    await page.getByRole('dialog').getByRole('button', { name: 'Saltar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('los controles del mapa inclinan, orientan y restauran la vista', async ({ page }) => {
    await openApp(page)
    await waitForMap(page)
    const toggle3d = page.getByRole('button', { name: 'Cambiar entre vista 3D y vista cenital' })
    await expect(toggle3d).toHaveAttribute('aria-pressed', 'true')
    await toggle3d.click()
    await expect(toggle3d).toHaveAttribute('aria-pressed', 'false')
    await toggle3d.click()
    await expect(toggle3d).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Orientar al norte' }).click()
    await page.getByRole('button', { name: 'Volver a la vista de Zibatá' }).click()
    await expect(page.getByRole('button', { name: /^Ver Xentric Anáhuac/ })).toBeVisible()
  })

  test('la vista inicial representa todas las plazas activas y la atribución es visible', async ({
    page,
  }) => {
    await openApp(page)
    await waitForMap(page)
    await expect.poll(() => representedPlazas(page)).toBe(await activePlazaCount(page))
    // Paseo Zibatá, la plaza con más locales, nunca debe desaparecer sin aviso.
    await expect(
      page
        .getByRole('button', { name: /^Ver Paseo Zibatá/ })
        .or(page.getByRole('button', { name: /^Acercar el mapa para ver .*Paseo Zibatá/ })),
    ).toBeVisible()
    const attribution = page.locator('.maplibregl-ctrl-attrib')
    await expect(attribution).toBeInViewport()
    // La atribución de OpenStreetMap no puede quedar debajo de la hoja inferior (solo existe en móvil).
    const sheet = page.locator('section[data-panel]')
    if ((await sheet.count()) > 0) {
      const sheetBox = await sheet.boundingBox()
      const box = await attribution.boundingBox()
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(sheetBox?.y ?? 0)
    }
  })

  test('con movimiento reducido cada plaza conserva su marcador en escritorio', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'En móvil las plazas cercanas se agrupan por espacio',
    )
    // Sin animaciones de cámara no hay pasadas extra: la colocación debe usar el ancho real de las etiquetas.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openApp(page)
    await waitForMap(page)
    await expect
      .poll(() => page.locator('button[data-mode]:not([data-mode="hidden"])').count())
      .toBe(await activePlazaCount(page))
    await expect(page.getByRole('button', { name: /^Acercar el mapa para ver/ })).toHaveCount(0)
  })

  test('las plazas agrupadas en "+N" aparecen al acercar el mapa', async ({ page }) => {
    await openApp(page)
    await waitForMap(page)
    const badge = page.getByRole('button', { name: /^Acercar el mapa para ver/ }).first()
    await page.waitForTimeout(800)
    test.skip(
      (await badge.count()) === 0,
      'En esta pantalla todas las plazas tienen marcador propio',
    )
    const names = ((await badge.getAttribute('aria-label')) ?? '').replace(/^.*: /, '').split(', ')
    await badge.click()
    // Cada plaza del grupo termina con marcador propio (en pantallas estrechas, tras algún toque más).
    for (const name of names) {
      await expect(await plazaMarker(page, name)).not.toHaveAttribute('data-mode', 'hidden')
    }
  })

  test('"Volver a la vista de Zibatá" funciona también con una plaza abierta', async ({ page }) => {
    // Sin animaciones, la cámara salta a su destino y la medición es determinista.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openApp(page, { hash: '#/plaza/condesa' })
    await waitForMap(page)
    await expect(
      panel(page).getByRole('heading', { level: 2, name: 'Plaza Condesa' }),
    ).toBeVisible()
    // Distancia en pantalla entre dos plazas: se reduce cuando la cámara vuelve a la vista general.
    const spread = () =>
      page.evaluate(() => {
        const anchor = (name: string) => {
          const marker = document.querySelector(`button[data-mode][aria-label^="Ver ${name}:"]`)
          const box = marker?.getBoundingClientRect()
          return box ? { x: box.left + box.width / 2, y: box.bottom } : { x: 0, y: 0 }
        }
        const a = anchor('Plaza Condesa')
        const b = anchor('Plaza Zielo')
        return Math.hypot(a.x - b.x, a.y - b.y)
      })
    await page.waitForTimeout(1000)
    const focused = await spread()
    await page.getByRole('button', { name: 'Volver a la vista de Zibatá' }).click()
    await expect.poll(spread).toBeLessThan(focused * 0.6)
    await expect.poll(() => representedPlazas(page)).toBe(await activePlazaCount(page))
    await expect(
      panel(page).getByRole('heading', { level: 2, name: 'Plaza Condesa' }),
    ).toBeVisible()
  })

  test('seleccionar una plaza en el mapa abre su panel y actualiza la URL', async ({ page }) => {
    await openApp(page)
    await waitForMap(page)
    const marker = await plazaMarker(page, 'Xentric Anáhuac')
    await marker.click()
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: 'Xentric Anáhuac' })).toBeVisible()
    await expect(region.getByText('Plaza · 20 lugares')).toBeVisible()
    await expect(
      region.getByRole('list', { name: 'Lugares en esta plaza' }).getByRole('listitem'),
    ).toHaveCount(20)
    await expect(page).toHaveURL(/#\/plaza\/xentric-anahuac$/)
    await expect(marker).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Móvil en horizontal', () => {
  test.use({ viewport: { width: 844, height: 390 } })

  test('el tutorial se puede recorrer y una plaza abierta deja el mapa visible', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Orientación horizontal de teléfono')
    // MapLibre avisa cuando un encuadre no cabe en el espacio libre (la cámara no se movería).
    const cameraWarnings: string[] = []
    page.on('console', (message) => {
      if (message.text().includes('cannot fit')) cameraWarnings.push(message.text())
    })
    await openApp(page, { onboarding: true })
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Siguiente' }).click()
    await dialog.getByRole('button', { name: 'Siguiente' }).click()
    await dialog.getByRole('button', { name: 'Empezar a explorar' }).click()
    await expect(dialog).toBeHidden()

    await waitForMap(page)
    // Con el zoom mínimo no caben todas las plazas sobre la hoja: las tapadas se agrupan en "+N".
    await expect.poll(() => coveredBySheet(page)).toEqual([])
    await expect.poll(() => representedPlazas(page)).toBe(await activePlazaCount(page))
    await page.getByRole('combobox', { name: 'Plaza' }).selectOption({ label: 'Paseo Zibatá' })
    await expect(panel(page).getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeVisible()
    const header = await page
      .locator('header', { has: page.getByRole('searchbox', { name: 'Buscar lugares' }) })
      .boundingBox()
    const sheet = await page.locator('section[data-panel]').boundingBox()
    // Queda una franja de mapa entre la barra superior y la hoja.
    expect((sheet?.y ?? 0) - ((header?.y ?? 0) + (header?.height ?? 0))).toBeGreaterThan(60)
    // La vista general también cabe en pantallas bajas (con y sin plaza abierta).
    await page.getByRole('button', { name: 'Volver a la vista de Zibatá' }).click()
    await page.waitForTimeout(1500)
    expect(cameraWarnings).toEqual([])
  })
})
