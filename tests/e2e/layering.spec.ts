import { expect, test } from '@playwright/test'
import { isMobile, openApp, panel, waitForMap } from './helpers.ts'

test.describe('capas y alineación', () => {
  test('las etiquetas de las zonas quedan por debajo del panel lateral', async ({ page }) => {
    await openApp(page, { path: 'plaza/paseo-zibata' })
    await waitForMap(page)
    test.skip(isMobile(page), 'El panel lateral es de escritorio; en móvil es la hoja inferior.')
    await expect(panel(page)).toBeVisible()
    // Se arrastra el mapa hacia el panel para que las etiquetas pasen por debajo de él.
    const side = await page.locator('aside[data-panel]').boundingBox()
    const y = (side?.y ?? 0) + (side?.height ?? 0) / 2
    await page.mouse.move(420, y)
    await page.mouse.down()
    await page.mouse.move(700, y, { steps: 12 })
    await page.mouse.move(820, y, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(900)

    const covered = await page.evaluate(() => {
      const side = document.querySelector('aside[data-panel]')?.getBoundingClientRect()
      if (!side) return { checked: 0, leaks: ['sin panel'] }
      const leaks: string[] = []
      let checked = 0
      for (const marker of document.querySelectorAll<HTMLElement>('button[data-mode]')) {
        const box = marker.getBoundingClientRect()
        const left = Math.max(box.left, side.left)
        const right = Math.min(box.right, side.right)
        const top = Math.max(box.top, side.top)
        const bottom = Math.min(box.bottom, side.bottom)
        if (right - left < 2 || bottom - top < 2) continue
        checked++
        const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2)
        if (!hit?.closest('aside[data-panel]')) leaks.push(marker.getAttribute('aria-label') ?? '?')
      }
      return { checked, leaks }
    })
    expect(covered.checked).toBeGreaterThan(0)
    expect(covered.leaks).toEqual([])
  })

  test('las pastillas de categoría del panel arrancan alineadas con el resto del contenido', async ({
    page,
  }) => {
    await openApp(page, { path: 'plaza/paseo-zibata' })
    await waitForMap(page)
    const region = panel(page)
    const heading = region.getByRole('heading', { level: 2 }).first()
    const firstChip = region.getByRole('list', { name: 'Categorías' }).getByRole('button').first()
    await expect(firstChip).toBeVisible()
    const [headingBox, chipBox] = [await heading.boundingBox(), await firstChip.boundingBox()]
    expect(Math.abs((chipBox?.x ?? 0) - (headingBox?.x ?? 99))).toBeLessThanOrEqual(1)
  })

  test('la flecha de desplazamiento aparece sobre el mapa y va centrada con las pastillas', async ({
    page,
  }) => {
    await openApp(page)
    await waitForMap(page)
    test.skip(isMobile(page), 'Las flechas son un atajo de ratón; con el dedo basta el gesto.')
    // La barra de filtros tiene que quedar acotada al ancho de la pantalla: si crece hasta su ancho
    // de contenido, el carril nunca desborda por dentro y la flecha no llega a aparecer.
    const rail = page.locator('[data-variant="floating"]')
    const arrow = rail.locator('[data-side="end"]')
    await expect(arrow).toBeVisible()
    const [arrowBox, chipBox] = [
      await arrow.boundingBox(),
      await rail.getByRole('button').first().boundingBox(),
    ]
    const centro = (box: { y: number; height: number } | null) =>
      (box?.y ?? 0) + (box?.height ?? 0) / 2
    expect(Math.abs(centro(arrowBox) - centro(chipBox))).toBeLessThanOrEqual(1)
    expect(Math.abs((arrowBox?.height ?? 0) - (chipBox?.height ?? 99))).toBeLessThanOrEqual(1)
  })

  test('las zonas en obra llevan insignia de obra y el texto "Próximamente" para lectores', async ({
    page,
  }) => {
    await openApp(page)
    await waitForMap(page)
    const soon = page.locator('.maplibregl-marker p:has(svg.lucide-construction)')
    await expect(soon.first()).toBeAttached()
    for (const label of await soon.all()) {
      await expect(label).toContainText('Próximamente')
      // "Próximamente" no se ve: lo dice la insignia redonda. En la vista general tampoco el nombre,
      // para que dos obras vecinas no se pisen ni tapen las cifras de las zonas abiertas.
      await expect(label.locator('span:has(svg) .visually-hidden')).toHaveText('Próximamente')
      await expect(label).toHaveAttribute('data-compact', 'true')
    }
    expect(await soon.count()).toBeGreaterThanOrEqual(2)
  })
})
