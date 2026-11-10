import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import {
  activePlazas,
  inactivePlazas,
  LOCAL,
  openApp,
  TRES_LOCALES,
  waitForMap,
} from './helpers.ts'

/** Lo que una persona lleva marcado en este dispositivo, escrito antes de que arranque la app. */
async function conMarcas(page: Page, idioma: 'es' | 'en' = 'es') {
  const [primero, segundo, tercero] = TRES_LOCALES
  const favoritos = [primero.id, segundo.id, tercero.id]
  const visitas = {
    [primero.id]: ['2026-10-01', '2026-10-20'],
    [segundo.id]: ['2026-10-11'],
    [tercero.id]: ['2026-10-02'],
  }
  const calificaciones = { [primero.id]: 4.5, [tercero.id]: 4 }
  await page.addInitScript(
    ([favoritos, visitas, calificaciones]) => {
      window.localStorage.setItem('zibata:favoritos', JSON.stringify(favoritos))
      window.localStorage.setItem('zibata:visitas', JSON.stringify(visitas))
      window.localStorage.setItem('zibata:calificaciones', JSON.stringify(calificaciones))
    },
    [favoritos, visitas, calificaciones] as const,
  )
  await openApp(page, { path: idioma === 'en' ? 'en' : '' })
  await waitForMap(page)
}

const abrirHoja = async (page: Page, nombre = 'Tu Zibatá') => {
  await page.getByRole('button', { name: nombre, exact: true }).click()
  const hoja = page.getByRole('dialog', { name: nombre })
  await expect(hoja).toBeVisible()
  return hoja
}

/** El mínimo razonable, dos teléfonos, un teléfono grande, una tableta, un netbook, el escritorio y tres paisajes. */
const TAMANOS = [
  [320, 480],
  [320, 568],
  [360, 640],
  [390, 844],
  [430, 932],
  [600, 960],
  [768, 1024],
  [1024, 600],
  [1280, 900],
  [740, 360],
  [844, 390],
  [568, 320],
] as const

/**
 * Comprueba una hoja en una ventana: que ni el panel, ni el diálogo, ni la página se desplacen y que
 * la hoja quepa entera. Se usa con marcas y sin ellas, porque el estado vacío ocupa más alto.
 */
async function comprobarHoja(page: Page, width: number, height: number, nombre: string) {
  /*
   * Cambiar de hoja no es lo que se mide aquí (eso lo cubre la prueba de teclado): se pulsa desde el
   * DOM para que la matriz no dependa del tiempo de espera de Playwright en cada clic. Con doce
   * tamaños por tres hojas, en un runner cargado ese tiempo agotaba la prueba.
   */
  await page.evaluate((hoja) => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find(
      (el) => el.textContent?.trim() === hoja,
    )
    if (tab instanceof HTMLElement) tab.click()
  }, nombre)
  await page.waitForTimeout(60)
  const medidas = await page.evaluate(() => {
    const panel = document.querySelector('[role="tabpanel"]')
    const dialogo = panel?.closest('[role="dialog"]')
    if (!panel || !dialogo) return null
    const caja = dialogo.getBoundingClientRect()
    return {
      desbordaPanel: panel.scrollHeight - panel.clientHeight,
      desbordaHoja: dialogo.scrollHeight - dialogo.clientHeight,
      arriba: caja.top,
      abajo: caja.bottom - window.innerHeight,
      pagina: document.documentElement.scrollHeight - window.innerHeight,
    }
  })
  expect(medidas, `sin medidas en ${width}×${height} ${nombre}`).not.toBeNull()
  expect(medidas?.desbordaPanel, `${width}×${height} ${nombre}: contenido`).toBeLessThanOrEqual(1)
  expect(medidas?.desbordaHoja, `${width}×${height} ${nombre}: hoja`).toBeLessThanOrEqual(1)
  expect(medidas?.pagina, `${width}×${height} ${nombre}: página`).toBeLessThanOrEqual(1)
  expect(medidas?.arriba, `${width}×${height} ${nombre}: borde de arriba`).toBeGreaterThanOrEqual(0)
  expect(medidas?.abajo, `${width}×${height} ${nombre}: borde de abajo`).toBeLessThanOrEqual(1)
}

test.describe('Tu Zibatá', () => {
  test('cuenta el paso por las zonas y ordena tus tres y tus gustos con lo marcado', async ({
    page,
  }) => {
    await conMarcas(page)
    const hoja = await abrirHoja(page)

    // Las tres hojas son pestañas de verdad, y la que se abre es la primera.
    await expect(hoja.getByRole('tab')).toHaveText(['Zonas', 'Podio', 'Gustos'])
    await expect(hoja.getByRole('tab', { name: 'Zonas' })).toHaveAttribute('aria-selected', 'true')

    // Zonas: una insignia por zona, en color las que ya estrenaste y transparentes las demás.
    const zonas = hoja.getByRole('list', { name: 'Zonas de Zibatá' })
    await expect(zonas.getByRole('listitem')).toHaveCount(
      activePlazas().length + inactivePlazas().length,
    )
    // Las próximas no llevan nombre: sello genérico que solo dice "Pronto".
    await expect(zonas.locator('[data-upcoming="true"]:not([data-filler="true"])')).toHaveCount(
      inactivePlazas().length,
    )
    await expect(zonas.getByText('Pronto').first()).toBeVisible()
    await expect(zonas).not.toContainText(inactivePlazas()[0]?.name.replace(/^Plaza\s+/, '') ?? '')
    // Y sellos de relleno completan la última fila de la rejilla de cuatro columnas (ninguno si ya está llena).
    const zonasEnTotal = activePlazas().length + inactivePlazas().length
    await expect(zonas.locator('[data-filler="true"]')).toHaveCount((4 - (zonasEnTotal % 4)) % 4)
    const estrenadas = new Set(TRES_LOCALES.map((place) => place.plazaId))
    await expect(zonas.locator('[data-visited="true"]')).toHaveCount(estrenadas.size)
    await expect(hoja.getByText(`${estrenadas.size} de ${activePlazas().length}`)).toBeVisible()

    // Podio: los tres que más marcaste, con lo que has hecho con ellos.
    await hoja.getByRole('tab', { name: 'Podio' }).click()
    const filas = hoja.getByRole('link', { name: /^Puesto \d[,.]/ })
    await expect(filas).toHaveCount(3)
    await expect(filas.first()).toHaveAttribute(
      'aria-label',
      `Puesto 1, guardado. Ver detalles de ${LOCAL.name}`,
    )
    await expect(filas.first()).toContainText('2 visitas')
    // Lo guardado ya no es una palabra: es el corazón sobre el icono.
    await expect(hoja.locator('ol > li').first()).toHaveAttribute('data-saved', 'true')

    // Gustos: el tipo de lugar, con cuántos de los tuyos caen en él.
    await hoja.getByRole('tab', { name: 'Gustos' }).click()
    await expect(hoja.getByText(/^Lo que más se te antoja$/)).toBeVisible()
    const gustos = hoja.getByRole('listitem')
    expect(await gustos.count()).toBeGreaterThan(0)
  })

  test('ninguna de las tres hojas se desplaza ni se sale de la pantalla', async ({
    page,
  }, testInfo) => {
    test.skip(
      !['desktop', 'webkit-iphone'].includes(testInfo.project.name),
      'La matriz se recorre una vez por motor, no por dispositivo',
    )
    // Doce tamaños por tres hojas: en un runner cargado, los 90 s de la suite se quedan cortos.
    test.setTimeout(180_000)
    /*
     * La hoja se abre una vez y lo que cambia es la ventana. Volver a cargar en cada tamaño costaba
     * cinco mapas más y no medía nada distinto: las reglas que deciden el alto son de la ventana, y
     * el navegador las vuelve a aplicar igual al redimensionar.
     */
    await page.setViewportSize({ width: 320, height: 568 })
    await conMarcas(page)
    await abrirHoja(page)

    // El mínimo razonable, dos teléfonos, un teléfono grande, una tableta, un netbook, el
    // escritorio y tres paisajes. Los que faltaban aquí fueron justo los que se desbordaban.
    for (const [width, height] of TAMANOS) {
      await page.setViewportSize({ width, height })
      for (const nombre of ['Zonas', 'Podio', 'Gustos']) {
        await comprobarHoja(page, width, height, nombre)
      }
    }
  })

  test('sin nada marcado, las tres hojas tampoco se desplazan', async ({ page }, testInfo) => {
    test.skip(
      !['desktop', 'webkit-iphone'].includes(testInfo.project.name),
      'La matriz se recorre una vez por motor, no por dispositivo',
    )
    // La misma holgura que la matriz con marcas.
    test.setTimeout(180_000)
    /*
     * El estado vacío ocupa más alto que el lleno: Zonas lleva el aviso de que todo está por
     * estrenar y Podio y Gustos, sus propias invitaciones. Se mide igual, sin sembrar marcas.
     */
    await page.setViewportSize({ width: 320, height: 568 })
    await openApp(page)
    await waitForMap(page)
    await abrirHoja(page)

    for (const [width, height] of TAMANOS) {
      await page.setViewportSize({ width, height })
      for (const nombre of ['Zonas', 'Podio', 'Gustos']) {
        await comprobarHoja(page, width, height, nombre)
      }
    }
  })

  test('las pestañas funcionan con el teclado y Escape cierra la hoja', async ({ page }) => {
    await conMarcas(page)
    const hoja = await abrirHoja(page)
    await expect(hoja.getByRole('tab', { name: 'Zonas' })).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(hoja.getByRole('tab', { name: 'Podio' })).toHaveAttribute('aria-selected', 'true')
    await expect(hoja.getByRole('tab', { name: 'Podio' })).toBeFocused()

    await page.keyboard.press('End')
    await expect(hoja.getByRole('tab', { name: 'Gustos' })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('Home')
    await expect(hoja.getByRole('tab', { name: 'Zonas' })).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('en inglés las hojas cambian de idioma', async ({ page }) => {
    await conMarcas(page, 'en')
    const hoja = await abrirHoja(page, 'Your Zibatá')
    await expect(hoja.getByRole('tab')).toHaveText(['Areas', 'Podium', 'Cravings'])
  })

  test('sin violaciones graves de accesibilidad en ninguna de las tres hojas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await conMarcas(page)
    const hoja = await abrirHoja(page)
    for (const nombre of ['Zonas', 'Podio', 'Gustos']) {
      await hoja.getByRole('tab', { name: nombre }).click()
      const violations = (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude('canvas.maplibregl-canvas')
          .analyze()
      ).violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target.join(' ')),
        }))
      expect(violations, `hoja ${nombre}`).toEqual([])
    }
  })
})
