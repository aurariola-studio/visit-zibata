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
     * La ficha se abre una vez y lo que cambia es la ventana, como en la matriz de Tu Zibatá: las
     * reglas que deciden la fila son de la ventana y el navegador las vuelve a aplicar al redimensionar.
     */
    await page.setViewportSize({ width: 320, height: 568 })
    await openApp(page, { path: 'lugar/tomassa' })
    await waitForSheet(page)
    const ficha = panel(page)
    const rating = ficha.locator('[class*="_rating_"]')
    const nota = rating.locator('p')
    // El bloque de la nota se pinta con la ficha; se espera antes de medir.
    await expect(rating.locator('fieldset')).toBeVisible()
    await expect(nota).toContainText('Califica este lugar')

    /** Lo que hay que mirar, leído del propio bloque y no de todo el documento. */
    const medir = () =>
      rating.evaluate((bloque) => {
        const nota = bloque.querySelector('p')
        const escala = bloque.querySelector('fieldset')
        const estrella = escala?.querySelector('span[class*="_star_"]')
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

    /** El panel cambia de sitio al cruzar el punto de escritorio y anima su ancho: se espera a que se quede quieto tres lecturas seguidas. */
    const anchoEstable = async () => {
      let previo = -1
      let iguales = 0
      for (let intento = 0; intento < 40; intento++) {
        const ancho = await rating.evaluate((bloque) =>
          Math.round(bloque.getBoundingClientRect().width),
        )
        if (ancho > 0 && ancho === previo) {
          iguales += 1
          if (iguales >= 3) return
        } else {
          iguales = 0
        }
        previo = ancho
        await page.waitForTimeout(100)
      }
    }

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
      await anchoEstable()
      const medidas = await medir()
      expect(medidas, `sin medidas en ${width}×${height}`).not.toBeNull()
      expect(medidas?.fila, `${width}×${height}: la nota baja a otra fila`).toBe(true)
      // Una línea de texto mide unos 17 px; dos serían bastante más.
      expect(medidas?.alto, `${width}×${height}: la nota se parte`).toBeLessThanOrEqual(20)
      expect(medidas?.notaDentro, `${width}×${height}: la nota se sale`).toBe(true)
      expect(medidas?.textoDentro, `${width}×${height}: la nota se recorta`).toBe(true)
      expect(medidas?.pagina, `${width}×${height}: desborde horizontal`).toBeLessThanOrEqual(0)

      /*
       * El estado de la vista previa cambia el texto a su versión más larga ("Calificar con 5
       * estrellas"). Se provoca con el foco en el radio, que es lo mismo que hace el teclado, sin
       * depender de coordenadas: el puntero sobre un bloque que se repinta era la fuente de las
       * intermitencias.
       */
      await ficha.getByRole('radio', { name: /con 5 estrellas$/ }).focus()
      await expect(nota).toContainText('Calificar con')
      const conVista = await medir()
      expect(conVista?.fila, `${width}×${height}: la vista previa baja a otra fila`).toBe(true)
      expect(conVista?.estrella, `${width}×${height}: la estrella cambia al cambiar el texto`).toBe(
        medidas?.estrella,
      )

      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await expect(nota).toContainText('Califica este lugar')
    }
  })
})
