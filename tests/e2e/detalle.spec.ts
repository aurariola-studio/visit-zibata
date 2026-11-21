import { expect, type Page, test } from '@playwright/test'
import {
  conPalabraQueEmpieza,
  dataset,
  LOCAL_COMPLETO,
  openApp,
  palabrasDe,
  panel,
  plazaDe,
  textoBuscable,
} from './helpers.ts'

/**
 * El detalle de los locales (descripción, enlaces, teléfono, ruta a la puerta) llega en un paquete aparte del
 * resumen (`places-detalle-*.js`). Estas pruebas miden lo que el presupuesto de bytes no puede medir: que la guía
 * se use mientras ese paquete no llega, que la ficha lo marque con esqueleto, que se complete al llegar y que un
 * fallo se pueda reintentar.
 */
const DETALLE = /\/assets\/places-detalle-[\w-]+\.js$/

/** Retiene el paquete del detalle hasta que la prueba lo suelte. */
async function retenerDetalle(page: Page): Promise<() => void> {
  let soltar: () => void = () => {}
  const puerta = new Promise<void>((resolve) => {
    soltar = resolve
  })
  await page.route(DETALLE, async (route) => {
    await puerta
    await route.continue()
  })
  return soltar
}

const primerasPalabras = (texto: string): string => texto.trim().split(/\s+/).slice(0, 3).join(' ')

test.describe('El detalle de los locales llega aparte', () => {
  test('mientras llega, la ficha se pinta con el resumen y un esqueleto, y al llegar se completa', async ({
    page,
  }) => {
    const soltar = await retenerDetalle(page)
    await openApp(page, { path: `lugar/${LOCAL_COMPLETO.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: LOCAL_COMPLETO.name })).toBeVisible()

    // Lo que falta está marcado, y "Cómo llegar" no se ofrece: iría a la zona y luego cambiaría de destino.
    await expect(region.getByText('Cargando los datos del lugar…')).toBeAttached()
    await expect(region.getByRole('link', { name: /Cómo llegar/ })).toHaveCount(0)
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toBeEnabled()

    soltar()
    await expect(region.getByRole('link', { name: /Cómo llegar/ })).toBeVisible()
    await expect(region.getByText('Cargando los datos del lugar…')).toHaveCount(0)
    if (LOCAL_COMPLETO.description) {
      await expect(region.getByRole('article')).toContainText(
        primerasPalabras(LOCAL_COMPLETO.description.es),
      )
    }
    if (LOCAL_COMPLETO.googleMapsUri) {
      await expect(region.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
        'href',
        LOCAL_COMPLETO.googleMapsUri,
      )
    }
  })

  test('las tarjetas, las zonas y la ficha se usan sin esperar al detalle', async ({ page }) => {
    const soltar = await retenerDetalle(page)
    const zona = plazaDe(LOCAL_COMPLETO)
    await openApp(page, { path: `zona/${zona.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: zona.name })).toBeVisible()
    // La tarjeta sale del resumen: con el detalle retenido ya está en la lista y se puede abrir.
    await region.getByRole('link', { name: `Ver detalles de ${LOCAL_COMPLETO.name}` }).click()
    await expect(region.getByRole('heading', { level: 2, name: LOCAL_COMPLETO.name })).toBeVisible()
    await expect(region.getByText('Cargando los datos del lugar…')).toBeAttached()
    soltar()
    await expect(region.getByRole('link', { name: /Cómo llegar/ })).toBeVisible()
  })

  test('una palabra que solo está en una descripción se encuentra cuando llega el detalle', async ({
    page,
  }) => {
    // Una palabra larga que solo aparece en la descripción de un local, y en ningún otro texto de la búsqueda.
    const elegido = dataset.places
      .filter((place) => place.active && place.description)
      .flatMap((place) => {
        const resto = palabrasDe(textoBuscable({ ...place, description: null }))
        return palabrasDe(place.description?.es ?? '')
          .filter((palabra) => /^[a-z]{9,}$/.test(palabra))
          .filter((palabra) => !resto.some((otra) => otra.startsWith(palabra.slice(0, 5))))
          .filter(
            (palabra) =>
              conPalabraQueEmpieza(palabra)
                .map((p) => p.id)
                .join() === place.id,
          )
          .map((palabra) => ({ place, palabra }))
      })[0]
    test.skip(!elegido, 'ningún local tiene una palabra solo en su descripción')
    if (!elegido) return

    const soltar = await retenerDetalle(page)
    await openApp(page)
    const buscador = page.getByRole('searchbox', { name: 'Buscar lugares' })
    const region = panel(page)
    const ficha = region.getByRole('link', { name: `Ver detalles de ${elegido.place.name}` })

    // Sin el detalle se busca por nombre, giro y plaza: la descripción todavía no cuenta.
    await buscador.fill(elegido.palabra)
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(ficha).toHaveCount(0)

    // Al llegar, el buscador se rehace con las descripciones y la misma búsqueda ya lo encuentra.
    soltar()
    await expect(ficha).toBeVisible()
  })

  test('si el paquete del detalle falla, la ficha avisa y Reintentar lo vuelve a pedir de verdad', async ({
    page,
  }) => {
    let pedidos = 0
    await page.route(DETALLE, async (route) => {
      pedidos += 1
      if (pedidos === 1) await route.abort()
      else await route.continue()
    })
    await openApp(page, { path: `lugar/${LOCAL_COMPLETO.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: LOCAL_COMPLETO.name })).toBeVisible()
    const aviso = region.getByRole('alert').filter({ hasText: 'No pudimos cargar la descripción' })
    await expect(aviso).toBeVisible()
    // El resto de la ficha y de la guía sigue en pie.
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toBeEnabled()

    await aviso.getByRole('button', { name: 'Reintentar' }).click()
    await expect(aviso).toHaveCount(0)
    await expect(region.getByRole('link', { name: /Cómo llegar/ })).toBeVisible()
    expect(pedidos).toBeGreaterThanOrEqual(2)
  })
})
