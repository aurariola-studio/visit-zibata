import { expect, test } from '@playwright/test'
import {
  AJENA,
  CATEGORIA_EN_ZONA,
  CATEGORIA_GRANDE,
  CON_ACENTO,
  CON_ERROR,
  conPalabraQueEmpieza,
  elegirZona,
  entrarAlSectorGrande,
  esc,
  LOCAL_BUSCABLE,
  openApp,
  POR_SINONIMO,
  panel,
  placesInCategory,
  placesInPlaza,
  RAIZ_DE_CATEGORIAS,
  TERMINOS_LITERALES,
  VARIOS_SECTORES,
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
    const ficha = (nombre: string) =>
      region.getByRole('link', { name: `Ver detalles de ${nombre}` })

    // Sin el acento que lleva su nombre.
    await search.fill(CON_ACENTO.consulta)
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(ficha(CON_ACENTO.place.name)).toBeVisible()

    // Por el sinónimo de su giro: ninguna palabra de su nombre ni de su descripción es esa.
    await search.fill(POR_SINONIMO.consulta)
    await expect(ficha(POR_SINONIMO.place.name)).toBeVisible()

    // Con una letra de menos en el nombre: sin coincidencia literal en nadie, entra la tolerancia.
    await search.fill(CON_ERROR.consulta)
    await expect(ficha(CON_ERROR.place.name)).toBeVisible()
  })

  test('una palabra con coincidencias literales no arrastra parecidos lejanos', async ({
    page,
  }) => {
    await openApp(page)
    const search = page.getByRole('searchbox', { name: 'Buscar lugares' })
    const region = panel(page)
    const enlaces = region.getByRole('link', { name: /^Ver detalles de/ })

    for (const termino of TERMINOS_LITERALES) {
      // Lo que devuelve una búsqueda literal: los locales con una palabra que EMPIEZA por el término
      // (en su nombre, su zona, su categoría, sus giros, sus sinónimos o su descripción).
      const esperados = conPalabraQueEmpieza(termino)
      expect(esperados.length, termino).toBeGreaterThan(0)
      await search.fill(termino)
      await expect(enlaces, termino).toHaveCount(esperados.length)
      // Y ninguno más: nada entra "por parecido" ("pasta" no trae "pastor", "bar" no trae "barista").
      const nombres = (await enlaces.evaluateAll((nodos) =>
        nodos.map((nodo) => nodo.getAttribute('aria-label') ?? ''),
      )) as string[]
      expect([...new Set(nombres)].sort(), termino).toEqual(
        [...new Set(esperados.map((place) => `Ver detalles de ${place.name}`))].sort(),
      )
    }
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
    // Una zona y una palabra de un local de otra que nada de la zona se parece.
    const { zona, place, consulta } = AJENA
    await openApp(page, { path: `zona/${zona.slug}` })
    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: zona.name })).toBeVisible()
    const ficha = region.getByRole('link', { name: `Ver detalles de ${place.name}` })

    await page.getByRole('searchbox', { name: 'Buscar lugares' }).fill(consulta)
    // La zona acota la búsqueda: el local está en otra zona.
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(ficha).toHaveCount(0)
    await expect(region.getByText(`Sin resultados en ${zona.name}`)).toBeVisible()

    // La puerta del estado vacío suelta la zona y repite la búsqueda sin borrarla.
    await region.getByRole('button', { name: 'Buscar en toda la guía' }).click()
    await expect(ficha).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Buscar lugares' })).toHaveValue(consulta)
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
    await entrarAlSectorGrande(page)
    const topCategories = page.getByRole('list', { name: 'Categorías' }).first()
    const categoria = CATEGORIA_EN_ZONA
    await topCategories.getByRole('link', { name: new RegExp(esc(categoria.label)) }).click()

    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: ZONA_GRANDE.name })).toBeVisible()
    const cards = region.getByRole('link', { name: /^Ver detalles de/ })
    const desayunos = placesInCategory(categoria.id, ZONA_GRANDE.name)
    await expect(cards).toHaveCount(desayunos)
    await expect(
      region.getByRole('link', { name: `Ver detalles de ${categoria.local.name}` }),
    ).toBeVisible()
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
    // Con varios sectores no hay "Todo": el sector mismo, a la izquierda, hace de "Todo" y no cuenta.
    if (!VARIOS_SECTORES) {
      await expect(topCategories.getByRole('link', { name: /^Todo/ })).toHaveAccessibleName(
        `Todo ${placesInPlaza(ZONA_GRANDE.name)}`,
      )
    }
    await expect(page).toHaveURL(
      new RegExp(`/es/zona/${ZONA_GRANDE.slug}\\?categoria=${categoria.slug}$`),
    )

    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click()
    await expect(page.getByRole('button', { name: 'Filtrar por zona' })).toContainText(
      'Todas las zonas',
    )
    if (VARIOS_SECTORES) {
      // Limpiar quita también el sector: la barra vuelve al primer nivel.
      await expect(page.getByRole('list', { name: 'Sectores' })).toBeVisible()
    } else {
      await expect(topCategories.getByRole('link', { name: /^Todo/ })).toHaveAttribute(
        'aria-current',
        'true',
      )
    }
  })

  test('una categoría sola muestra una sola lista, con la zona en cada tarjeta', async ({
    page,
  }) => {
    await openApp(page, { path: RAIZ_DE_CATEGORIAS })
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
