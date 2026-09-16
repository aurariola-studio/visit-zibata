import { expect, test } from '@playwright/test'
import { isMobile, openApp, panel } from './helpers.ts'

test.describe('Teclado, enlaces y favoritos', () => {
  test('el primer Tab ofrece "Ir al buscador" y lleva el foco al campo de búsqueda', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'Navegación con teclado físico')
    await openApp(page)
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('button', { name: 'Ir al buscador' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toBeFocused()
  })

  test('Escape cierra el tutorial y no vuelve a aparecer en la sesión', async ({ page }) => {
    await openApp(page, { onboarding: true })
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('zibata:onboarding-visto')))
      .toBe('1')
    await page.reload()
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toBeVisible()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('Escape cierra la ficha y después el panel de la plaza', async ({ page }) => {
    await openApp(page, { hash: '#/lugar/tomassa' })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: 'Tomassa' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(region.getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeVisible()
    await expect(page).toHaveURL(/#\/plaza\/paseo-zibata$/)
    await page.keyboard.press('Escape')
    await expect(region.getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeHidden()
    await expect(page).toHaveURL(/#\/$/)
  })

  test('Escape en el buscador borra el texto sin cerrar la plaza abierta', async ({ page }) => {
    await openApp(page, { hash: '#/plaza/paseo-zibata' })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeVisible()
    const search = page.getByRole('searchbox', { name: 'Buscar lugares' })
    await search.fill('pizza')
    await search.press('Escape')
    await expect(search).toHaveValue('')
    await expect(region.getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeVisible()
  })

  for (const hash of ['#/lugar/no-existe', '#/plaza/plaza-walmart']) {
    test(`un enlace a un registro no publicado avisa y limpia la URL (${hash})`, async ({
      page,
    }) => {
      await openApp(page, { hash })
      const message = 'Ese enlace apunta a un lugar que ya no está en la guía.'
      await expect(page.getByRole('main').getByText(message)).toBeVisible()
      // El mismo aviso llega a lectores de pantalla por la única región viva.
      await expect(page.locator('[aria-live="polite"]')).toHaveText(message)
      await expect(page).toHaveURL(/#\/$/)
      await page.getByRole('button', { name: 'Cerrar aviso' }).click()
      await expect(page.getByRole('main').getByText(message)).toBeHidden()
    })
  }

  test('el contador de favoritos ignora identificadores que ya no están en la guía', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem(
        'zibata:favoritos',
        JSON.stringify(['tomassa', 'lugar-cerrado-hace-tiempo', 'otro-inexistente']),
      ),
    )
    await openApp(page)
    const toggle = page.getByRole('button', { name: /Favoritos/ })
    await expect(toggle).toContainText('1')
    await toggle.click()
    if (isMobile(page)) {
      await expect(panel(page).getByRole('button', { name: /^Ver detalles de/ })).toHaveCount(1)
    } else {
      await expect(
        panel(page).getByRole('button', { name: 'Ver detalles de Tomassa' }),
      ).toBeVisible()
    }
  })

  test('una sola región viva anuncia el número de resultados', async ({ page }) => {
    await openApp(page, { hash: '#/plaza/paseo-zibata' })
    await page.getByRole('searchbox', { name: 'Buscar lugares' }).fill('pizza')
    const live = page.locator('[aria-live]')
    await expect(live).toHaveCount(1)
    await expect(live).toHaveText(/^\d+ resultados?$/)
  })
})
