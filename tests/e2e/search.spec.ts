import { expect, test } from '@playwright/test'
import { openApp, panel } from './helpers.ts'

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
      region.getByRole('button', { name: 'Ver detalles de Good Morning Coffee' }),
    ).toBeVisible()

    await search.fill('coffee')
    await expect(
      region.getByRole('button', { name: 'Ver detalles de D’Lu Coffee & Bakery' }),
    ).toBeVisible()

    await search.fill('pizeria')
    await expect(region.getByRole('button', { name: "Ver detalles de Domino's" })).toBeVisible()

    await search.fill('helado')
    await expect(
      region.getByRole('button', { name: "Ver detalles de Husky's Ice Cream" }),
    ).toBeVisible()
  })

  test('una palabra con coincidencias literales no arrastra parecidos lejanos', async ({
    page,
  }) => {
    await openApp(page)
    const search = page.getByRole('searchbox', { name: 'Buscar lugares' })
    const region = panel(page)
    await search.fill('pasta')
    await expect(region.getByRole('button', { name: /^Ver detalles de/ })).toHaveCount(3)
    await search.fill('bar')
    await expect(region.getByRole('button', { name: /^Ver detalles de/ })).toHaveCount(10)
    // La tolerancia a errores sigue funcionando cuando no hay coincidencias literales.
    await search.fill('rometa')
    await expect(
      region.getByRole('button', { name: 'Ver detalles de Rometta Gastrobar' }),
    ).toBeVisible()
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
    await page.getByRole('combobox', { name: 'Plaza' }).selectOption({ label: 'Paseo Zibatá' })
    const topCategories = page.getByRole('list', { name: 'Categorías' }).first()
    await topCategories.getByRole('button', { name: /Desayunos y café/ }).click()

    const region = panel(page)
    await expect(region.getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeVisible()
    const cards = region.getByRole('button', { name: /^Ver detalles de/ })
    await expect(cards).toHaveCount(3)
    await expect(
      region.getByRole('button', { name: 'Ver detalles de D’Lu Coffee & Bakery' }),
    ).toBeVisible()
    await expect(page.getByText('3 resultados', { exact: true }).first()).toBeVisible()
    // Las pastillas anuncian los mismos conteos que la plaza seleccionada (arriba y en el panel).
    await expect(topCategories.getByRole('button', { name: /Desayunos y café/ })).toHaveText(/3$/)
    await expect(topCategories.getByRole('button', { name: /^Todo/ })).toHaveText(/22$/)
    await expect(page).toHaveURL(/#\/plaza\/paseo-zibata\?categoria=desayunos-y-cafe$/)

    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click()
    await expect(page.getByRole('combobox', { name: 'Plaza' })).toHaveValue('')
    await expect(topCategories.getByRole('button', { name: /^Todo/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('una categoría sola muestra resultados agrupados por plaza', async ({ page }) => {
    await openApp(page)
    await page
      .getByRole('list', { name: 'Categorías' })
      .first()
      .getByRole('button', { name: /Bar y pub/ })
      .click()
    const region = panel(page)
    await expect(region.getByRole('heading', { name: 'Resultados' })).toBeVisible()
    await expect(region.getByRole('button', { name: /^Xentric Anáhuac/ })).toBeVisible()
    await expect(region.getByRole('button', { name: /^Paseo Zibatá/ })).toBeVisible()
    await region.getByRole('button', { name: /^Paseo Zibatá/ }).click()
    await expect(region.getByRole('heading', { level: 2, name: 'Paseo Zibatá' })).toBeVisible()
    await expect(region.getByRole('button', { name: /^Ver detalles de/ })).toHaveCount(2)
  })
})
