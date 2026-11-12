import { expect, test } from '@playwright/test'
import {
  CATEGORIA_B,
  CATEGORIA_EN_ZONA,
  CATEGORIA_GRANDE,
  entrarAlSectorGrande,
  esc,
  openApp,
  panel,
  placesInCategory,
  RAIZ_DE_CATEGORIAS,
  SECTOR_GRANDE,
  VARIOS_SECTORES,
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
    await openApp(page, { path: RAIZ_DE_CATEGORIAS })
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

    // Volver a pulsarla la quita, y la cápsula elegida apunta a la vista sin categoría: la portada o,
    // con varios sectores, el sector (quitar la categoría deja el sector, no sube de nivel).
    const sinCategoria = new RegExp(`/es${RAIZ_DE_CATEGORIAS ? `/${RAIZ_DE_CATEGORIAS}` : ''}$`)
    await expect(grande).toHaveAttribute('href', sinCategoria)
    await grande.click()
    await expect(page).toHaveURL(sinCategoria)
    if (VARIOS_SECTORES) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${esc(SECTOR_GRANDE?.label.es ?? '')}\\.`) }),
      ).toHaveAttribute('aria-current', 'true')
    } else {
      await expect(cápsulas(page).getByRole('link', { name: /^Todo/ })).toHaveAttribute(
        'aria-current',
        'true',
      )
    }
  })

  test('cambiar de categoría no llena el historial: atrás no recorre las cápsulas', async ({
    page,
  }) => {
    await openApp(page, { path: RAIZ_DE_CATEGORIAS })
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
    await openApp(page, { path: RAIZ_DE_CATEGORIAS })
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
    await expect(page).toHaveURL(
      new RegExp(`/es${RAIZ_DE_CATEGORIAS ? `/${RAIZ_DE_CATEGORIAS}` : ''}$`),
    )
    const respuesta = await page.request.get(new URL(href ?? '', page.url()).href)
    expect(respuesta.status()).toBe(200)
  })
})

test.describe('Sectores', () => {
  // Con un solo sector con locales la fila de sectores no existe: no hay otro sector a donde ir. Con
  // locales de un segundo sector aparece sola y el carril baja de nivel (ver docs/CATALOGO.md).
  test('con un solo sector con locales no hay fila de sectores, y las categorías siguen como siempre', async ({
    page,
  }) => {
    test.skip(VARIOS_SECTORES, 'El dato ya tiene más de un sector con locales.')
    await openApp(page)
    await waitForMap(page)
    await expect(cápsulas(page)).toBeVisible()
    await expect(page.getByRole('list', { name: 'Sectores' })).toHaveCount(0)
  })

  test('con varios sectores, la portada enseña los sectores y dentro de uno su cápsula queda fija', async ({
    page,
  }) => {
    test.skip(!VARIOS_SECTORES, 'Con un solo sector no hay nivel que bajar.')
    await openApp(page)
    await waitForMap(page)
    const sectores = page.getByRole('list', { name: 'Sectores' })
    await expect(sectores.getByRole('link')).not.toHaveCount(0)
    await expect(cápsulas(page)).toHaveCount(0)

    await entrarAlSectorGrande(page)
    await expect(cápsulas(page)).toBeVisible()
    // La cápsula del sector no es parte de la lista que se desplaza: se queda a la izquierda.
    const cabecera = page.getByRole('link', {
      name: new RegExp(`^${esc(SECTOR_GRANDE?.label.es ?? '')}\\.`),
    })
    await expect(cabecera).toHaveAttribute('aria-current', 'true')
    await expect(
      cápsulas(page).getByRole('link', {
        name: new RegExp(`^${esc(SECTOR_GRANDE?.label.es ?? '')}\.`),
      }),
    ).toHaveCount(0)
    const antes = await cabecera.boundingBox()
    await cápsulas(page).evaluate((lista) => {
      const carril = lista.parentElement
      if (carril) carril.scrollLeft = carril.scrollWidth
    })
    const despues = await cabecera.boundingBox()
    expect(despues?.x).toBe(antes?.x)
  })
})
