import { expect, test } from '@playwright/test'
import {
  CATEGORIA_B,
  CATEGORIA_EN_ZONA,
  CATEGORIA_GRANDE,
  esc,
  openApp,
  panel,
  placesInCategory,
  waitForMap,
  ZONA_GRANDE,
} from './helpers.ts'

/*
 * Cada categoría es una página con su propia dirección (`/categoria/x`, `/en/category/x`), y sus
 * cápsulas son enlaces de verdad. Aquí se comprueba el comportamiento en el navegador; el HTML que se
 * sirve lo comprueban `seo-regresion.spec.ts` y `scripts/build/prerender.metadatos.test.ts`, y la
 * redirección de los enlaces antiguos, `worker/redireccion.test.ts` (`vite preview` no tiene Worker).
 */

const cápsulas = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Categorías' }).first()

test.describe('Páginas de categoría', () => {
  test('abrir la dirección de una categoría muestra sus locales con su cápsula elegida', async ({
    page,
  }) => {
    await openApp(page, { path: `categoria/${CATEGORIA_GRANDE.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/es/categoria/${CATEGORIA_GRANDE.slug}$`))
    await expect(
      cápsulas(page).getByRole('link', { name: new RegExp(`^${esc(CATEGORIA_GRANDE.label)}`) }),
    ).toHaveAttribute('aria-current', 'true')
    // Los locales que se ven son los de la categoría, no un recorte.
    await expect(
      page.getByText(`${placesInCategory(CATEGORIA_GRANDE.id)} resultados`).first(),
    ).toBeVisible()
  })

  test('la cápsula es un enlace con la dirección de su página, y elegirla filtra sin recargar', async ({
    page,
  }) => {
    await openApp(page)
    await waitForMap(page)
    const grande = cápsulas(page).getByRole('link', {
      name: new RegExp(`^${esc(CATEGORIA_GRANDE.label)}`),
    })
    await expect(grande).toHaveAttribute('href', new RegExp(`/categoria/${CATEGORIA_GRANDE.slug}$`))

    await page.evaluate(() => {
      ;(window as unknown as { __marca: string }).__marca = 'misma-carga'
    })
    await grande.click()
    await expect(page).toHaveURL(new RegExp(`/es/categoria/${CATEGORIA_GRANDE.slug}$`))
    // Sin recarga: la marca puesta en la página sigue ahí.
    expect(await page.evaluate(() => (window as unknown as { __marca?: string }).__marca)).toBe(
      'misma-carga',
    )
    await expect(grande).toHaveAttribute('aria-current', 'true')

    // Volver a pulsarla la quita, y la cápsula elegida apunta a la vista sin categoría.
    await expect(grande).toHaveAttribute('href', /\/es$/)
    await grande.click()
    await expect(page).toHaveURL(/\/es$/)
    await expect(cápsulas(page).getByRole('link', { name: /^Todo/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('una cápsula elegida lejos del borde queda a la vista dentro del carril', async ({
    page,
  }) => {
    // La última del carril es la más lejana: con el carril en su principio quedaría fuera de la pantalla.
    await openApp(page)
    await waitForMap(page)
    const href = await cápsulas(page).getByRole('link').last().getAttribute('href')
    const slug = href?.split('/').pop()
    if (!slug) throw new Error('no hay una última categoría')

    await openApp(page, { path: `categoria/${slug}` })
    const elegida = cápsulas(page).locator('[aria-current="true"]')
    await expect(elegida).toBeVisible()
    const carril = cápsulas(page).locator('xpath=..')
    await expect
      .poll(async () => {
        const [a, b] = await Promise.all([elegida.boundingBox(), carril.boundingBox()])
        if (!a || !b) return false
        return a.x >= b.x && a.x + a.width <= b.x + b.width
      })
      .toBe(true)
  })

  test('cambiar de categoría no llena el historial: atrás no recorre las cápsulas', async ({
    page,
  }) => {
    await openApp(page)
    const antes = await page.evaluate(() => window.history.length)
    await cápsulas(page)
      .getByRole('link', { name: new RegExp(`^${esc(CATEGORIA_GRANDE.label)}`) })
      .click()
    await expect(page).toHaveURL(new RegExp(`/es/categoria/${CATEGORIA_GRANDE.slug}$`))
    await cápsulas(page)
      .getByRole('link', { name: new RegExp(`^${esc(CATEGORIA_B.label)} `) })
      .click()
    await expect(page).toHaveURL(new RegExp(`/es/categoria/${CATEGORIA_B.slug}$`))
    expect(await page.evaluate(() => window.history.length)).toBe(antes)
  })

  test('un enlace antiguo con parámetro se lleva a la dirección de la categoría', async ({
    page,
  }) => {
    await openApp(page, { path: `?categoria=${CATEGORIA_GRANDE.slug}` })
    await expect(page).toHaveURL(new RegExp(`/es/categoria/${CATEGORIA_GRANDE.slug}$`))
    await expect(
      cápsulas(page).getByRole('link', { name: new RegExp(`^${esc(CATEGORIA_GRANDE.label)}`) }),
    ).toHaveAttribute('aria-current', 'true')
  })

  test('en inglés tiene su propia ruta y sus propios nombres', async ({ page }) => {
    await openApp(page, { path: `en/category/${CATEGORIA_GRANDE.slugEn}` })
    await expect(page).toHaveURL(new RegExp(`/en/category/${CATEGORIA_GRANDE.slugEn}$`))
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  })

  test('dentro de una zona la categoría sigue siendo un filtro de esa zona', async ({ page }) => {
    await openApp(page, { path: `zona/${ZONA_GRANDE.slug}` })
    // Una categoría que esa zona tiene de verdad: la de uno de sus locales.
    const categoria = CATEGORIA_EN_ZONA
    const enlace = cápsulas(page).getByRole('link', { name: new RegExp(esc(categoria.label)) })
    await expect(enlace).toHaveAttribute(
      'href',
      new RegExp(`/zona/${ZONA_GRANDE.slug}\\?categoria=${categoria.slug}$`),
    )
    await enlace.click()
    await expect(page).toHaveURL(
      new RegExp(`/es/zona/${ZONA_GRANDE.slug}\\?categoria=${categoria.slug}$`),
    )
  })

  test('con Ctrl el enlace no se intercepta: apunta a una página que existe', async ({ page }) => {
    await openApp(page)
    const grande = cápsulas(page).getByRole('link', {
      name: new RegExp(`^${esc(CATEGORIA_GRANDE.label)}`),
    })
    const href = await grande.getAttribute('href')
    expect(href).toMatch(new RegExp(`/categoria/${CATEGORIA_GRANDE.slug}$`))
    // Lo que importa es que la app no cancele el clic (el navegador abre la pestaña) y que el destino
    // exista. No se espera a la pestaña nueva: en CI a veces se queda en about:blank y la prueba dependía
    // de eso (falló en el despliegue de #59, en escritorio y tableta).
    await page.evaluate(() => {
      ;(window as unknown as { __clic: Promise<boolean> }).__clic = new Promise((resolve) => {
        window.addEventListener('click', (event) => resolve(event.defaultPrevented), { once: true })
      })
    })
    await grande.click({ modifiers: ['Control'] })
    const cancelado = await page.evaluate(
      () => (window as unknown as { __clic: Promise<boolean> }).__clic,
    )
    expect(cancelado).toBe(false)
    await expect(page).toHaveURL(/\/es$/)
    const respuesta = await page.request.get(new URL(href ?? '', page.url()).href)
    expect(respuesta.status()).toBe(200)
  })
})
