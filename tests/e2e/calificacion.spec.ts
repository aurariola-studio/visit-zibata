import { expect, test } from '@playwright/test'
import { openApp, panel, waitForSheet } from './helpers.ts'

test.describe('Calificación en la ficha', () => {
  test('las estrellas y su texto caben en una fila en todos los anchos', async ({
    page,
  }, testInfo) => {
    test.skip(
      !['desktop', 'webkit-iphone'].includes(testInfo.project.name),
      'La matriz se recorre una vez por motor, no por dispositivo',
    )
    /*
     * La hoja se abre una vez y lo que cambia es la ventana, como en la matriz de Tu Zibatá: las
     * reglas que deciden la fila son de la ventana y el navegador las vuelve a aplicar al redimensionar.
     */
    await page.setViewportSize({ width: 320, height: 568 })
    await openApp(page, { path: 'lugar/tomassa' })
    await waitForSheet(page)
    const ficha = panel(page)
    const rating = ficha.locator('[class*="_rating_"]')
    const nota = rating.locator('p')
    const estrellas = rating.locator('fieldset')
    const quinta = estrellas.locator('[class*="_star_"]').nth(4)

    for (const [width, height] of [
      [320, 568],
      [360, 640],
      [390, 844],
      [768, 1024],
      [1024, 768],
      [1280, 900],
      [1440, 900],
      [1920, 1080],
    ] as const) {
      await page.setViewportSize({ width, height })
      const medidas = await page.evaluate(() => {
        const nota = document.querySelector('[class*="_rating_"] p')
        const escala = document.querySelector('[class*="_rating_"] fieldset')
        const estrella = escala?.querySelector('[class*="_star_"]')
        if (!nota || !escala || !estrella) return null
        const n = nota.getBoundingClientRect()
        const e = escala.getBoundingClientRect()
        return {
          fila: n.top < e.bottom && n.bottom > e.top && n.left >= e.right - 1,
          alto: Math.round(n.height),
          estrella: Math.round(estrella.getBoundingClientRect().width),
          notaDentro: n.right <= document.documentElement.clientWidth + 1,
          textoDentro: nota.scrollWidth <= nota.clientWidth + 1,
          pagina: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      expect(medidas, `sin medidas en ${width}×${height}`).not.toBeNull()
      expect(medidas?.fila, `${width}×${height}: la nota baja a otra fila`).toBe(true)
      // Una línea de texto mide unos 17 px; dos serían bastante más.
      expect(medidas?.alto, `${width}×${height}: la nota se parte`).toBeLessThanOrEqual(20)
      expect(medidas?.notaDentro, `${width}×${height}: la nota se sale`).toBe(true)
      expect(medidas?.textoDentro, `${width}×${height}: la nota se recorta`).toBe(true)
      expect(medidas?.pagina, `${width}×${height}: desborde horizontal`).toBeLessThanOrEqual(0)

      // El texto cambia al pasar el puntero; ni la estrella ni la fila se deben mover.
      await quinta.scrollIntoViewIfNeeded()
      const caja = await quinta.boundingBox()
      expect(caja).not.toBeNull()
      if (!caja) continue
      await quinta.hover({
        position: { x: caja.width * 0.8, y: caja.height / 2 },
        force: true,
      })
      await expect(nota).toContainText('Calificar con')
      const despues = await page.evaluate(() => {
        const nota = document.querySelector('[class*="_rating_"] p')
        const estrella = document.querySelector('[class*="_rating_"] fieldset [class*="_star_"]')
        if (!nota || !estrella) return null
        return {
          estrella: Math.round(estrella.getBoundingClientRect().width),
          nota: Math.round(nota.getBoundingClientRect().left),
        }
      })
      expect(despues?.estrella, `${width}×${height}: la estrella cambia al pasar el puntero`).toBe(
        medidas?.estrella,
      )
      await page.mouse.move(0, 0)
      await expect(nota).toContainText('Califica este lugar')
    }
  })
})
