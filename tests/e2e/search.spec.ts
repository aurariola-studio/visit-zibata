import { expect, test } from '@playwright/test'
import {
  CATEGORIA_GRANDE,
  categoriaDe,
  elegirZona,
  esc,
  LOCAL,
  LOCAL_BUSCABLE,
  openApp,
  panel,
  placesInCategory,
  placesInPlaza,
  queDicen,
  ZONA_B,
  ZONA_GRANDE,
} from './helpers.ts'

test.describe('Búsqueda y filtros', () => {
  test('encuentra lugares ignorando acentos, con sinónimos y con errores menores', async ({
    page,
  }) => {
    await openApp(page)
    const search = page.getByRole('searchbox', { name: 'Buscar lugares' })
    const region = panel(page)

    await search.fill('cafe')
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(
      region.getByRole('link', { name: 'Ver detalles de Good Morning Coffee' }),
    ).toBeVisible()

    await search.fill('coffee')
    await expect(
      region.getByRole('link', { name: 'Ver detalles de D’Lu Coffee & Bakery' }),
    ).toBeVisible()

    await search.fill('pizeria')
    await expect(region.getByRole('link', { name: "Ver detalles de Domino's" })).toBeVisible()

    await search.fill('helado')
    await expect(
      region.getByRole('link', { name: "Ver detalles de Husky's Ice Cream" }),
    ).toBeVisible()
  })

  test('una palabra con coincidencias literales no arrastra parecidos lejanos', async ({
    page,
  }) => {
    await openApp(page)
    const search = page.getByRole('searchbox', { name: 'Buscar lugares' })
    const region = panel(page)
    // Primero quien sirve pasta; detrás, el resto de "Italiana" (su categoría, incluidos los
    // locales cuyo segundo giro es una pizzería).
    await search.fill('pasta')
    await expect(region.getByRole('link', { name: /^Ver detalles de/ })).toHaveCount(
      placesInCategory('italiana'),
    )
    // El primero sirve pasta de verdad: lo dice su nombre o su descripción en el dato.
    const sirven = queDicen('italiana', 'pasta')
    expect(sirven.length).toBeGreaterThan(0)
    await expect(
      region.getByRole('link', { name: /^Ver detalles de/ }).first(),
    ).toHaveAccessibleName(
      new RegExp(`^Ver detalles de (${sirven.map((place) => esc(place.name)).join('|')})`),
    )
    // Todos llevan "bar" literal en su nombre, categoría o descripción: ninguno entra por parecido.
    await search.fill('bar')
    // Entra lo que lleva "bar" en el nombre, en la categoría o en la descripción…
    await expect(
      region.getByRole('link', { name: 'Ver detalles de Wicklow Irish Pub' }),
    ).toBeVisible()
    // …y no entra nada por parecido: "Bagel" no empieza por "bar".
    await expect(region.getByRole('link', { name: 'Ver detalles de Mr. Bagel' })).toHaveCount(0)
    // La tolerancia a errores sigue funcionando cuando no hay coincidencias literales.
    await search.fill('rometa')
    await expect(
      region.getByRole('link', { name: 'Ver detalles de Rometta Gastrobar' }),
    ).toBeVisible()
  })

  test('escribir con una ficha abierta no quita el foco del buscador', async ({ page }) => {
    await openApp(page, { path: `lugar/${LOCAL_BUSCABLE.slug}` })
    const search = page.getByRole('searchbox', { name: 'Buscar lugares' })
    await search.click()
    // La primera letra cierra la ficha y monta otro panel detrás: el foco se queda donde se escribe.
    const letras = LOCAL_BUSCABLE.name.slice(0, 3).toLowerCase()
    await search.pressSequentially(letras, { delay: 120 })
    await expect(search).toBeFocused()
    await expect(search).toHaveValue(letras)
    await expect(
      panel(page).getByRole('link', { name: `Ver detalles de ${LOCAL_BUSCABLE.name}` }),
    ).toBeVisible()
  })

  test('con una plaza abierta, la búsqueda mira dentro de la plaza y ofrece buscar en toda la guía', async ({
    page,
  }) => {
    await openApp(page, { path: 'zona/plaza-luna' })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: 'Plaza Luna' })).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar lugares' }).fill('ramen')
    // La zona acota la búsqueda: Castore está en Xentric Anáhuac, no en Plaza Luna.
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(region.getByRole('link', { name: /^Ver detalles de Castore/ })).toHaveCount(0)
    await expect(region.getByText('Sin resultados en Plaza Luna')).toBeVisible()

    // La puerta del estado vacío suelta la zona y repite la búsqueda sin borrarla.
    await region.getByRole('button', { name: 'Buscar en toda la guía' }).click()
    await expect(region.getByRole('link', { name: /^Ver detalles de Castore/ })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toHaveValue('ramen')
    await expect(page.getByRole('button', { name: 'Filtrar por zona' })).toContainText(
      'Todas las zonas',
    )
  })

  test('muestra un estado vacío y permite limpiar la búsqueda', async ({ page }) => {
    await openApp(page)
    await page.getByRole('searchbox', { name: 'Buscar lugares' }).fill('xyzxyz')
    const region = panel(page)
    await expect(region.getByText('Sin resultados')).toBeVisible()
    await region.getByRole('button', { name: 'Limpiar filtros' }).last().click()
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toHaveValue('')
    await expect(region.getByText('Sin resultados')).toBeHidden()
  })

  test('combina plaza y categoría, informa el número de resultados y limpia los filtros', async ({
    page,
  }) => {
    await openApp(page)
    await elegirZona(page, ZONA_GRANDE.name)
    const topCategories = page.getByRole('list', { name: 'Categorías' }).first()
    const categoria = categoriaDe(LOCAL)
    await topCategories.getByRole('link', { name: new RegExp(esc(categoria.label)) }).click()

    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: ZONA_GRANDE.name })).toBeVisible()
    const cards = region.getByRole('link', { name: /^Ver detalles de/ })
    const desayunos = placesInCategory(categoria.id, ZONA_GRANDE.name)
    await expect(cards).toHaveCount(desayunos)
    await expect(region.getByRole('link', { name: `Ver detalles de ${LOCAL.name}` })).toBeVisible()
    await expect(page.getByText(`${desayunos} resultados`, { exact: true }).first()).toBeVisible()
    /*
     * Las cápsulas **anuncian** los mismos conteos que la plaza seleccionada, y anuncian es la
     * palabra: la cifra vive en el nombre accesible y no en la pantalla. Se quitó de la vista
     * porque diecinueve cifras repetidas no dicen más que una, y el número de lo que estás viendo
     * ya lo da la cabecera del panel, junto a la lista que cuenta. Quien no ve la fila sí la
     * necesita, porque no puede mirar cuál está llena.
     */
    await expect(
      topCategories.getByRole('link', { name: new RegExp(esc(categoria.label)) }),
    ).toHaveAccessibleName(`${categoria.label} ${desayunos}`)
    await expect(topCategories.getByRole('link', { name: /^Todo/ })).toHaveAccessibleName(
      `Todo ${placesInPlaza(ZONA_GRANDE.name)}`,
    )
    await expect(page).toHaveURL(
      new RegExp(`/es/zona/${ZONA_GRANDE.slug}\\?categoria=${categoria.slug}$`),
    )

    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click()
    await expect(page.getByRole('button', { name: 'Filtrar por zona' })).toContainText(
      'Todas las zonas',
    )
    await expect(topCategories.getByRole('link', { name: /^Todo/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('una categoría sola muestra una sola lista, con la zona en cada tarjeta', async ({
    page,
  }) => {
    await openApp(page)
    await page
      .getByRole('list', { name: 'Categorías' })
      .first()
      .getByRole('link', { name: new RegExp(`^${esc(CATEGORIA_GRANDE.label)} `) })
      .click()
    // Una categoría sola es su propia página: la barra de direcciones lo dice.
    await expect(page).toHaveURL(new RegExp(`/es/categoria/${CATEGORIA_GRANDE.slug}$`))
    const region = panel(page)
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    // Una lista, no una sección por plaza: ya no hay cabecera de zona que enlazar.
    await expect(
      region.getByRole('link', {
        name: new RegExp(`^(${esc(ZONA_GRANDE.name)}|${esc(ZONA_B.name)})`),
      }),
    ).toHaveCount(0)
    await expect(region.getByRole('link', { name: /^Ver detalles de/ })).toHaveCount(
      placesInCategory(CATEGORIA_GRANDE.id),
    )
    // La zona sigue a la vista, ahora como fila de la tarjeta.
    await expect(region.getByText(ZONA_GRANDE.name).first()).toBeVisible()
  })
})
