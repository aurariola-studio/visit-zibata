import { expect, test } from '@playwright/test'
import { LOCAL, localesDe, openApp, panel, waitForSheet, ZONA_GRANDE } from './helpers.ts'

test.describe('Orden personal', () => {
  test('sin historial, la plaza muestra su orden curado; con gustos, lo preferido sube', async ({
    page,
  }) => {
    await openApp(page, { path: `zona/${ZONA_GRANDE.slug}` })
    await waitForSheet(page)
    const cards = panel(page).getByRole('link', { name: /^Ver detalles de/ })
    await expect(cards.first()).toBeVisible()
    const curated = await cards.allTextContents()
    // El favorito es un local que el orden curado NO pone primero: el que va más atrás de la zona.
    const candidato = localesDe(ZONA_GRANDE)
      .map((place) => ({
        place,
        posicion: curated.findIndex((texto) => texto.includes(place.name)),
      }))
      .filter((fila) => fila.posicion >= 2)
      .sort((a, b) => b.posicion - a.posicion)[0]
    if (!candidato) throw new Error('la zona necesita un local que no vaya entre los dos primeros')
    const favorito = candidato.place
    expect(curated[0]).not.toContain(favorito.name)

    // Favorito guardado en este dispositivo (lo mismo que pulsar el corazón en otra visita).
    await page.evaluate(
      (id) => window.localStorage.setItem('zibata:favoritos', JSON.stringify([id])),
      favorito.id,
    )
    await page.reload()
    await waitForSheet(page)
    /*
     * El índice ordena por horario pero ya no se parte, así que el orden personal manda **dentro de
     * los que comparten estado**: un favorito cerrado no sube por encima de los que sí están
     * abiertos. No se comprueba que sea la primera tarjeta de la zona, porque eso dependería de la
     * hora a la que corra la prueba, sino las dos cosas que el producto sí promete siempre: que
     * subió, y que ninguno de su mismo estado le pasa por delante.
     */
    const porEstado = await page.evaluate(() => {
      // La lista de lugares, no la de categorías: la que contiene tarjetas que abren una ficha.
      const lista = [...document.querySelectorAll('[data-panel] ul')].find((candidata) =>
        candidata.querySelector('a[aria-label^="Ver detalles de"]'),
      )
      if (!lista) return []
      return [...lista.querySelectorAll('li')].map((item) => ({
        nombre: item.querySelector('a')?.getAttribute('aria-label') ?? '',
        estado: item.querySelector('[data-estado]')?.getAttribute('data-estado') ?? '?',
      }))
    })
    const luka = porEstado.findIndex((fila) => fila.nombre.includes(favorito.name))
    expect(luka, `orden: ${porEstado.map((f) => f.nombre).join(' | ')}`).toBeGreaterThanOrEqual(0)
    expect(luka).toBeLessThan(candidato.posicion)
    const suEstado = porEstado[luka]?.estado
    const primeroDeSuEstado = porEstado.findIndex((fila) => fila.estado === suEstado)
    expect(primeroDeSuEstado, `estados: ${porEstado.map((f) => f.estado).join(',')}`).toBe(luka)
  })

  test('marcar un favorito dentro de la lista no la reordena bajo el dedo', async ({ page }) => {
    await openApp(page, { path: `zona/${ZONA_GRANDE.slug}` })
    await waitForSheet(page)
    const region = panel(page)
    const cards = region.getByRole('link', { name: /^Ver detalles de/ })
    await expect(cards.first()).toBeVisible()
    const before = await cards.allTextContents()
    await region
      .getByRole('button', { name: `Guardar en favoritos: ${LOCAL.name}` })
      .first()
      .click()
    await expect(cards).toHaveText(before)
  })
})
