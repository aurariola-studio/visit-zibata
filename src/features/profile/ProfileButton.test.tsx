// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithCatalog } from '../../test/render.tsx'
import { favoritesStore } from '../favorites/useFavorites.ts'
import { interactionsStore } from '../ranking/preferences.ts'
import { ratingsStore } from '../ratings/useRatings.ts'
import { today, visitsStore } from '../visits/useVisits.ts'
import { ProfileButton } from './ProfileButton.tsx'

afterEach(() => {
  favoritesStore.write(new Set())
  ratingsStore.write(new Map())
  interactionsStore.write(new Map())
  visitsStore.write(new Map())
})

/** La hoja viaja en su propio trozo de JS: se espera a que cargue, como en el navegador. */
const openSheet = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Tu Zibatá' }))
  return screen.findByRole('dialog', { name: 'Tu Zibatá' })
}

describe('ProfileButton', () => {
  it('sin nada hecho invita a empezar en cada hoja, sin inventar cifras', async () => {
    // Abrir fichas no es haber ido: con solo eso, las tres hojas siguen vacías.
    interactionsStore.write(new Map([['cafe-aurora', { opens: 4, lastOpenedAt: Date.now() }]]))
    await renderWithCatalog(<ProfileButton onOpenInfo={vi.fn()} onOpenPlace={vi.fn()} />)
    const sheet = await openSheet()

    expect(within(sheet).getByRole('tab', { name: 'Zonas' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(sheet).getByText(/Todo Zibatá por estrenar/)).toBeInTheDocument()
    expect(within(sheet).getByText('0 de 2')).toBeInTheDocument()

    await userEvent.click(within(sheet).getByRole('tab', { name: 'Podio' }))
    // Los tres puestos se enseñan apagados, para que la hoja no quede en blanco.
    expect(sheet.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(3)

    await userEvent.click(within(sheet).getByRole('tab', { name: 'Gustos' }))
    // Y los seis renglones que se llenarán con las marcas.
    expect(sheet.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(6)
  })

  it('marca las zonas visitadas, sin convertirlas en botones', async () => {
    visitsStore.write(
      new Map([
        ['cafe-aurora', ['2026-09-20', today()]],
        ['tacos-el-farol', [today()]],
      ]),
    )
    await renderWithCatalog(<ProfileButton onOpenInfo={vi.fn()} onOpenPlace={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Tu Zibatá' })).toHaveAttribute('data-active', 'true')
    const sheet = await openSheet()
    // Las dos visitas son de Plaza Norte: queda Plaza Sur por estrenar.
    expect(within(sheet).getByText('1 de 2')).toBeInTheDocument()
    const zonas = within(sheet).getByRole('list', { name: 'Zonas de Zibatá' })
    expect(
      within(zonas)
        .getAllByRole('listitem')
        .map((item) => item.dataset.visited),
    ).toEqual(['true', 'false'])
    expect(within(zonas).queryAllByRole('button')).toHaveLength(0)
  })

  it('elige tus tres y enseña lo que has hecho con ellos', async () => {
    ratingsStore.write(
      new Map([
        ['panaderia-trigo', 5],
        ['cafe-aurora', 3],
      ]),
    )
    visitsStore.write(new Map([['tacos-el-farol', ['2026-09-01', '2026-09-02']]]))
    favoritesStore.write(new Set(['pizza-norte']))
    await renderWithCatalog(<ProfileButton onOpenInfo={vi.fn()} onOpenPlace={vi.fn()} />)
    const sheet = await openSheet()
    await userEvent.click(within(sheet).getByRole('tab', { name: 'Podio' }))

    // `link` y no `button`: cada fila del podio lleva a la ficha de ese lugar, que tiene dirección
    // propia, así que es un enlace de verdad y se anuncia como tal.
    const filas = within(sheet).getAllByRole('link', { name: /^Puesto \d\./ })
    // Primero las estrellas (5 y 3), luego las visitas; el favorito sin nota ni visitas se queda fuera.
    expect(filas.map((fila) => fila.getAttribute('aria-label'))).toEqual([
      'Puesto 1. Ver detalles de Trigo',
      'Puesto 2. Ver detalles de Café Aurora',
      'Puesto 3. Ver detalles de Tacos El Farol',
    ])
    // El detalle es lo que has hecho con el lugar, nunca el criterio que lo ordena.
    expect(filas[0]).toHaveTextContent('Plaza Sur')
    expect(filas[2]).toHaveTextContent('2 visitas')
  })

  it('se pasa de hoja con las flechas, Inicio y Fin', async () => {
    await renderWithCatalog(<ProfileButton onOpenInfo={vi.fn()} onOpenPlace={vi.fn()} />)
    const sheet = await openSheet()
    const zonas = within(sheet).getByRole('tab', { name: 'Zonas' })
    // Al abrir, el foco entra en la pestaña activa: se sigue con el teclado sin buscar dónde está.
    expect(zonas).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(within(sheet).getByRole('tab', { name: 'Podio' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(sheet).getByRole('tab', { name: 'Podio' })).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(within(sheet).getByRole('tab', { name: 'Gustos' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Desde la primera, la flecha izquierda da la vuelta a la última.
    await userEvent.keyboard('{Home}{ArrowLeft}')
    expect(within(sheet).getByRole('tab', { name: 'Gustos' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('un lugar de la hoja abre su ficha, y el pie lleva a las páginas de la guía', async () => {
    favoritesStore.write(new Set(['cafe-aurora']))
    const onOpenPlace = vi.fn()
    const onOpenInfo = vi.fn()
    await renderWithCatalog(<ProfileButton onOpenInfo={onOpenInfo} onOpenPlace={onOpenPlace} />)
    let sheet = await openSheet()

    await userEvent.click(within(sheet).getByRole('tab', { name: 'Podio' }))
    await userEvent.click(
      within(sheet).getByRole('link', {
        name: /^Puesto 1(, guardado)?\. Ver detalles de Café Aurora$/,
      }),
    )
    expect(onOpenPlace).toHaveBeenCalledWith(expect.objectContaining({ id: 'cafe-aurora' }))

    sheet = await openSheet()
    await userEvent.click(within(sheet).getByRole('link', { name: 'Sugiere' }))
    expect(onOpenInfo).toHaveBeenCalledWith('sugerir')
  })
})
