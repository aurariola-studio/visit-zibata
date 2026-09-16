import { expect, test } from '@playwright/test'
import { isMobile, openApp, panel, waitForMap } from './helpers.ts'

test.describe('Plazas y lugares', () => {
  test('abre el detalle de un lugar y el botón "Cómo llegar" lleva a Google Maps', async ({
    page,
    context,
  }) => {
    // Nunca se sale a internet en los tests: Google Maps se simula.
    await context.route(/^https:\/\/www\.google\.com\/maps/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>Google Maps (simulado)</title>',
      }),
    )
    await openApp(page, { hash: '#/plaza/condesa' })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: 'Plaza Condesa' })).toBeVisible()

    await region.getByRole('button', { name: 'Ver detalles de Bendito Bocado' }).click()
    await expect(region.getByRole('heading', { level: 2, name: 'Bendito Bocado' })).toBeVisible()
    await expect(page).toHaveURL(/#\/lugar\/bendito-bocado$/)
    // Enlace oficial verificado en la investigación (research/business-audit.json).
    await expect(region.getByRole('link', { name: /Facebook/ })).toHaveAttribute(
      'href',
      'https://www.facebook.com/p/Bendito-Bocado-Zibat%C3%A1-61552620264859/',
    )

    const directions = region.getByRole('link', { name: /Cómo llegar/ })
    await expect(directions).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=20.68097%2C-100.316595',
    )
    await expect(directions).toHaveAttribute('target', '_blank')
    const popupPromise = page.waitForEvent('popup')
    await directions.click()
    const popup = await popupPromise
    await expect(popup).toHaveURL(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/)
    await popup.close()

    await region.getByRole('button', { name: 'Volver a Plaza Condesa' }).click()
    await expect(region.getByRole('heading', { level: 2, name: 'Plaza Condesa' })).toBeVisible()
  })

  test('un enlace directo a un lugar abre su ficha', async ({ page }) => {
    await openApp(page, { hash: '#/lugar/tomassa' })
    await expect(panel(page).getByRole('heading', { level: 2, name: 'Tomassa' })).toBeVisible()
    await expect(panel(page).getByRole('article', { name: 'Tomassa' })).toContainText(
      'Paseo Zibatá',
    )
  })

  test('"atrás" en el navegador cierra la plaza seleccionada', async ({ page }) => {
    await openApp(page)
    await waitForMap(page)
    await page.getByRole('combobox', { name: 'Plaza' }).selectOption({ label: 'Plaza Zielo' })
    await expect(page).toHaveURL(/#\/plaza\/plaza-zielo$/)
    await expect(panel(page).getByRole('heading', { level: 2, name: 'Plaza Zielo' })).toBeVisible()
    await page.goBack()
    await expect(page).not.toHaveURL(/plaza-zielo/)
    await expect(panel(page).getByRole('heading', { level: 2, name: 'Plaza Zielo' })).toBeHidden()
  })

  test('se pueden guardar favoritos y filtrar por ellos', async ({ page }) => {
    await openApp(page, { hash: '#/plaza/plaza-zielo' })
    const region = panel(page)
    await region.getByRole('button', { name: 'Guardar en favoritos: Escarola' }).click()
    await expect(
      region.getByRole('button', { name: 'Quitar de favoritos: Escarola' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await region.getByRole('button', { name: 'Cerrar panel' }).click()
    await page.getByRole('button', { name: /Favoritos/ }).click()
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(region.getByRole('button', { name: /^Ver detalles de/ })).toHaveCount(1)
    await page.reload()
    await expect(page.getByRole('button', { name: /Favoritos/ })).toContainText('1')
  })

  test('en móvil la hoja inferior se expande y se reduce sin tapar todo el mapa', async ({
    page,
  }) => {
    test.skip(!isMobile(page), 'Solo aplica a la hoja inferior móvil')
    await openApp(page)
    await waitForMap(page)
    await page.getByRole('button', { name: 'Ver plazas' }).click()
    const handle = page.getByRole('button', { name: 'Reducir panel' })
    await expect(handle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: /^Xentric Anáhuac, 20 lugares/ })).toBeVisible()
    const box = await panel(page).boundingBox()
    const viewport = page.viewportSize()
    expect(box && viewport ? box.height / viewport.height : 1).toBeLessThan(0.9)
    await handle.click()
    await expect(page.getByRole('button', { name: 'Ampliar panel' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
