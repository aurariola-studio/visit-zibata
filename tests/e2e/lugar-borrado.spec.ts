import { expect, test } from '@playwright/test'
import { openApp, waitForMap } from './helpers.ts'

/**
 * Un local borrado desde el panel sigue en el navegador de quien lo marcó: favoritos, visitas, notas e
 * interacciones guardan su id en este dispositivo. La guía tiene que ignorarlo sin romperse.
 *
 * El id es inventado a propósito; la prueba no nombra ningún local de la guía.
 */
const FANTASMA = 'local-que-ya-no-existe'

test('los ids guardados de un local borrado no rompen el perfil, el filtro ni el mapa', async ({
  page,
}) => {
  const errores: string[] = []
  page.on('pageerror', (error) => errores.push(error.message))

  await page.addInitScript((id) => {
    window.localStorage.setItem('zibata:favoritos', JSON.stringify([id]))
    window.localStorage.setItem('zibata:visitas', JSON.stringify({ [id]: ['2026-10-01'] }))
    window.localStorage.setItem('zibata:calificaciones', JSON.stringify({ [id]: 4 }))
    window.localStorage.setItem(
      'zibata:interacciones',
      JSON.stringify({ [id]: { opens: 2, lastOpenedAt: 1_000 } }),
    )
  }, FANTASMA)
  await openApp(page)
  await waitForMap(page)

  // El filtro de favoritos cuenta el id guardado, pero no tiene a qué mostrar: no se cae.
  const favoritos = page.getByRole('switch', { name: /favorit/i })
  if (await favoritos.count()) await favoritos.first().click()

  // La hoja del perfil ordena y cuenta lo marcado: con un id que no existe, sigue abriendo.
  await page.getByRole('button', { name: 'Tu Zibatá', exact: true }).click()
  const hoja = page.getByRole('dialog', { name: 'Tu Zibatá' })
  await expect(hoja).toBeVisible()
  await expect(hoja).not.toContainText(FANTASMA)

  await expect(page.getByText(/No pudimos cargar los lugares/)).toHaveCount(0)
  expect(errores).toEqual([])
})
