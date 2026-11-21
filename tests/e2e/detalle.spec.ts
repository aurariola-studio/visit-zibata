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

/**
 * Retiene el paquete del detalle hasta que la prueba lo suelte.
 *
 * Quien lo usa abre la guía con `waitUntil: 'commit'`: con una petición retenida, esperar al evento `load` ata la
 * prueba a si el navegador cuenta esa petición como parte de la carga. En WebKit, en un corredor lento, `page.goto`
 * llegó a agotar sus 90 s por eso (no se reprodujo en local). Las expectativas que siguen esperan por su cuenta.
 */
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
    await openApp(page, { path: `lugar/${LOCAL_COMPLETO.slug}`, waitUntil: 'commit' })
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
    await openApp(page, { path: `zona/${zona.slug}`, waitUntil: 'commit' })
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
    await openApp(page, { waitUntil: 'commit' })
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

/**
 * Cuándo se pide el paquete del detalle. Se deja para el reposo del navegador, tras pintar la guía, para no competir
 * con el mapa por la red; si algo lo necesita antes (una ficha, el buscador), se pide al instante.
 */
test.describe('El detalle de los locales se pide en reposo', () => {
  /** Cuenta las peticiones del paquete del detalle. */
  async function contarPedidos(page: Page): Promise<() => number> {
    let pedidos = 0
    await page.route(DETALLE, async (route) => {
      pedidos += 1
      await route.continue()
    })
    return () => pedidos
  }

  /** Un navegador que nunca encuentra un respiro: solo lo que necesita el detalle puede pedirlo. */
  const sinReposo = () =>
    Object.assign(window, { requestIdleCallback: () => 0, cancelIdleCallback: () => {} })

  test('no se pide mientras nada lo necesite, y enfocar el buscador lo pide al instante', async ({
    page,
  }) => {
    await page.addInitScript(sinReposo)
    const pedidos = await contarPedidos(page)
    await openApp(page)
    const buscador = page.getByRole('searchbox', { name: 'Buscar lugares' })
    await expect(buscador).toBeEnabled()
    await page.waitForTimeout(2500)
    expect(pedidos()).toBe(0)

    await buscador.focus()
    await expect.poll(pedidos).toBe(1)
  })

  test('abrir una ficha desde la lista lo pide al instante', async ({ page }) => {
    await page.addInitScript(sinReposo)
    const pedidos = await contarPedidos(page)
    const zona = plazaDe(LOCAL_COMPLETO)
    await openApp(page, { path: `zona/${zona.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: zona.name })).toBeVisible()
    await page.waitForTimeout(1500)
    expect(pedidos()).toBe(0)

    await region.getByRole('link', { name: `Ver detalles de ${LOCAL_COMPLETO.name}` }).click()
    await expect.poll(pedidos).toBe(1)
    await expect(region.getByRole('link', { name: /Cómo llegar/ })).toBeVisible()
  })

  test('entrar por una ficha lo pide a la vez que el resumen', async ({ page }) => {
    await page.addInitScript(sinReposo)
    const pedidos = await contarPedidos(page)
    await openApp(page, { path: `lugar/${LOCAL_COMPLETO.slug}` })
    await expect(panel(page).getByRole('link', { name: /Cómo llegar/ })).toBeVisible()
    expect(pedidos()).toBe(1)
  })

  test('si nadie lo necesita, llega solo cuando el navegador queda libre', async ({ page }) => {
    const pedidos = await contarPedidos(page)
    await openApp(page)
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toBeEnabled()
    await expect.poll(pedidos, { timeout: 15_000 }).toBe(1)
  })

  test('con el ahorro de datos activado no se pide solo, pero sí al abrir una ficha', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } }),
    )
    const pedidos = await contarPedidos(page)
    const zona = plazaDe(LOCAL_COMPLETO)
    await openApp(page, { path: `zona/${zona.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: zona.name })).toBeVisible()
    // Más que el tope de espera del reposo (4 s): si se pidiera por su cuenta, ya habría salido.
    await page.waitForTimeout(5500)
    expect(pedidos()).toBe(0)

    await region.getByRole('link', { name: `Ver detalles de ${LOCAL_COMPLETO.name}` }).click()
    await expect.poll(pedidos).toBe(1)
  })
})
