import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { activePlazas, openApp, placeById, waitForMap } from './helpers.ts'

/** Lo que una persona lleva marcado en este dispositivo, escrito antes de que arranque la app. */
async function conMarcas(page: Page, idioma: 'es' | 'en' = 'es') {
  const favoritos = ['tomassa', 'cosi-fan-tutte', 'el-hornero']
  const visitas = {
    tomassa: ['2026-10-01', '2026-10-20'],
    'cosi-fan-tutte': ['2026-10-11'],
    'el-hornero': ['2026-10-02'],
  }
  await page.addInitScript(
    ([favoritos, visitas]) => {
      window.localStorage.setItem('zibata:favoritos', JSON.stringify(favoritos))
      window.localStorage.setItem('zibata:visitas', JSON.stringify(visitas))
      window.localStorage.setItem(
        'zibata:calificaciones',
        JSON.stringify({ tomassa: 4.5, 'el-hornero': 4 }),
      )
    },
    [favoritos, visitas] as const,
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

test.describe('Tu Zibatá', () => {
  test('cuenta el paso por las zonas y ordena tus tres y tus gustos con lo marcado', async ({
    page,
  }) => {
    await conMarcas(page)
    const hoja = await abrirHoja(page)

    // Las tres hojas son pestañas de verdad, y la que se abre es la primera.
    await expect(hoja.getByRole('tab')).toHaveText(['Zonas', 'Podio', 'Gustos'])
    await expect(hoja.getByRole('tab', { name: 'Zonas' })).toHaveAttribute('aria-selected', 'true')

    // Zonas: una insignia por zona activa, llenas las que ya estrenaste.
    const zonas = hoja.getByRole('list', { name: 'Zonas de Zibatá' })
    await expect(zonas.getByRole('listitem')).toHaveCount(activePlazas().length)
    const estrenadas = new Set(
      ['tomassa', 'cosi-fan-tutte', 'el-hornero'].map((id) => placeById(id).plazaId),
    )
    await expect(zonas.locator('[data-visited="true"]')).toHaveCount(estrenadas.size)
    await expect(hoja.getByText(`${estrenadas.size} de ${activePlazas().length}`)).toBeVisible()

    // Podio: los tres que más marcaste, con lo que has hecho con ellos.
    await hoja.getByRole('tab', { name: 'Podio' }).click()
    const filas = hoja.getByRole('link', { name: /^Puesto \d\./ })
    await expect(filas).toHaveCount(3)
    await expect(filas.first()).toHaveAttribute(
      'aria-label',
      `Puesto 1. Ver detalles de ${placeById('tomassa').name}`,
    )
    await expect(filas.first()).toContainText('2 visitas')
    await expect(filas.first()).toContainText('guardado')

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
    /*
     * La hoja se abre una vez y lo que cambia es la ventana. Volver a cargar en cada tamaño costaba
     * cinco mapas más y no medía nada distinto: las reglas que deciden el alto son de la ventana, y
     * el navegador las vuelve a aplicar igual al redimensionar.
     */
    await page.setViewportSize({ width: 320, height: 568 })
    await conMarcas(page)
    const hoja = await abrirHoja(page)

    // El mínimo razonable, dos teléfonos, una tableta en vertical, el escritorio y un teléfono de lado.
    for (const [width, height] of [
      [320, 568],
      [375, 667],
      [390, 844],
      [768, 1024],
      [1280, 900],
      [844, 390],
    ] as const) {
      await page.setViewportSize({ width, height })
      for (const nombre of ['Zonas', 'Podio', 'Gustos']) {
        await hoja.getByRole('tab', { name: nombre }).click()
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
        expect(
          medidas?.desbordaPanel,
          `${width}×${height} ${nombre}: contenido`,
        ).toBeLessThanOrEqual(1)
        expect(medidas?.desbordaHoja, `${width}×${height} ${nombre}: hoja`).toBeLessThanOrEqual(1)
        expect(medidas?.pagina, `${width}×${height} ${nombre}: página`).toBeLessThanOrEqual(1)
        expect(
          medidas?.arriba,
          `${width}×${height} ${nombre}: borde de arriba`,
        ).toBeGreaterThanOrEqual(0)
        expect(medidas?.abajo, `${width}×${height} ${nombre}: borde de abajo`).toBeLessThanOrEqual(
          1,
        )
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
    await expect(hoja.getByRole('tab')).toHaveText(['Areas', 'Podium', 'Tastes'])
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
