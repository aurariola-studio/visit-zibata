// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaceDetail } from '../features/places/PlaceDetail.tsx'
import { SearchBar } from '../features/search/SearchBar.tsx'
import { makePlace, plazasFixture } from '../test/fixtures.ts'
import { InMemoryPlacesRepository } from '../test/render.tsx'
import { CatalogProvider, useCatalogState } from './CatalogContext.tsx'
import { projectSummary } from './placeParts.ts'

/** Cuenta cuántas veces se pide el detalle. */
class RepositorioQueCuenta extends InMemoryPlacesRepository {
  pedidos = 0
  override getPlaceDetails() {
    this.pedidos += 1
    return super.getPlaceDetails()
  }
}

function Listo({ children }: { children: ReactNode }) {
  const { state } = useCatalogState()
  return state.status === 'ready' ? <div data-testid="listo">{children}</div> : null
}

const plaza = plazasFixture[0] as (typeof plazasFixture)[number]

describe('el detalle de los locales, cuándo se pide', () => {
  beforeEach(() => {
    // Un navegador que nunca encuentra un respiro: solo lo que lo necesita puede pedir el detalle.
    window.requestIdleCallback = vi.fn(() => 1) as never
    window.cancelIdleCallback = vi.fn()
  })
  afterEach(() => {
    // Se desmonta antes de quitar los dobles: al desmontar, la espera pendiente se cancela con cancelIdleCallback.
    cleanup()
    Reflect.deleteProperty(window, 'requestIdleCallback')
    Reflect.deleteProperty(window, 'cancelIdleCallback')
  })

  it('en reposo no lo pide mientras nada lo necesite, aunque el catálogo ya esté pintado', async () => {
    const repositorio = new RepositorioQueCuenta()
    render(
      <CatalogProvider repository={repositorio} detalle="en-reposo">
        <Listo>
          <SearchBar value="" onChange={() => {}} />
        </Listo>
      </CatalogProvider>,
    )
    await screen.findByTestId('listo')
    expect(repositorio.pedidos).toBe(0)
  })

  it('enfocar el buscador lo pide al instante, sin esperar al reposo', async () => {
    const repositorio = new RepositorioQueCuenta()
    render(
      <CatalogProvider repository={repositorio} detalle="en-reposo">
        <Listo>
          <SearchBar value="" onChange={() => {}} />
        </Listo>
      </CatalogProvider>,
    )
    await screen.findByTestId('listo')
    await userEvent.click(screen.getByRole('searchbox'))
    expect(repositorio.pedidos).toBe(1)
    // Y enfocarlo otra vez no lo vuelve a pedir.
    await userEvent.tab()
    await userEvent.click(screen.getByRole('searchbox'))
    expect(repositorio.pedidos).toBe(1)
  })

  it('abrir una ficha lo pide al instante', async () => {
    const repositorio = new RepositorioQueCuenta()
    const lugar = makePlace({ id: 'cafe-aurora', plazaId: plaza.id, name: 'Café Aurora' })
    render(
      <CatalogProvider repository={repositorio} detalle="en-reposo">
        <Listo>
          <PlaceDetail
            place={projectSummary(lugar)}
            plaza={plaza}
            backLabel="Volver"
            onBack={() => {}}
            onClose={() => {}}
          />
        </Listo>
      </CatalogProvider>,
    )
    await screen.findByTestId('listo')
    expect(await screen.findByRole('heading', { level: 2, name: 'Café Aurora' })).toBeVisible()
    expect(repositorio.pedidos).toBe(1)
  })

  it('con la opción ya lo pide a la vez que el catálogo, sin esperar a nadie', async () => {
    const repositorio = new RepositorioQueCuenta()
    render(
      <CatalogProvider repository={repositorio} detalle="ya">
        <Listo>{null}</Listo>
      </CatalogProvider>,
    )
    await screen.findByTestId('listo')
    expect(repositorio.pedidos).toBe(1)
  })
})
