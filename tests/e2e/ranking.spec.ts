import { expect, test } from '@playwright/test'
import { openApp, panel, waitForSheet } from './helpers.ts'

test.describe('Orden personal', () => {
  test('sin historial, la plaza muestra su orden curado; con gustos, lo preferido sube', async ({
    page,
  }) => {
    await openApp(page, { path: 'zona/paseo-zibata' })
    await waitForSheet(page)
    const cards = panel(page).getByRole('button', { name: /^Ver detalles de/ })
    await expect(cards.first()).toBeVisible()
    const curated = await cards.allTextContents()
    expect(curated[0]).not.toContain('Luka')

    // Favorito guardado en este dispositivo (lo mismo que pulsar el corazón en otra visita).
    await page.evaluate(() =>
      window.localStorage.setItem('zibata:favoritos', JSON.stringify(['luka-pokes'])),
    )
    await page.reload()
    await waitForSheet(page)
    await expect(cards.first()).toHaveAccessibleName('Ver detalles de Luka')
  })

  test('marcar un favorito dentro de la lista no la reordena bajo el dedo', async ({ page }) => {
    await openApp(page, { path: 'zona/paseo-zibata' })
    await waitForSheet(page)
    const region = panel(page)
    const cards = region.getByRole('button', { name: /^Ver detalles de/ })
    await expect(cards.first()).toBeVisible()
    const before = await cards.allTextContents()
    await region
      .getByRole('button', { name: /Guardar .*Luka/ })
      .first()
      .click()
    await expect(cards).toHaveText(before)
  })
})
