// @vitest-environment jsdom
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectDetail, projectSummary } from '../../data/placeParts.ts'
import { setLocale } from '../../i18n/index.ts'
import { makePlace, plazasFixture } from '../../test/fixtures.ts'
import { InMemoryPlacesRepository, renderWithCatalog } from '../../test/render.tsx'
import type { PlaceDetailData } from '../../types/domain.ts'
import { PlaceDetail } from './PlaceDetail.tsx'

const plaza = plazasFixture[0] as (typeof plazasFixture)[number]

const lugar = makePlace({
  id: 'cafe-aurora',
  plazaId: plaza.id,
  name: 'Café Aurora',
  giros: ['cafeteria'],
  hours: null,
  photos: [],
  description: { es: 'Café de especialidad.', en: 'Specialty coffee.' },
  links: { website: 'https://example.com/' },
  googleMapsUri: 'https://maps.app.goo.gl/abc123',
})

/** El detalle llega cuando la prueba lo decide, o falla las veces que se pida antes de llegar. */
class RepositorioConDetalleLento extends InMemoryPlacesRepository {
  pedidos = 0
  private entregar: ((detalle: PlaceDetailData[]) => void) | undefined
  private fallar: ((error: Error) => void) | undefined

  override getPlaceDetails() {
    this.pedidos += 1
    return new Promise<PlaceDetailData[]>((resolve, reject) => {
      this.entregar = resolve
      this.fallar = reject
    })
  }

  llega(detalle: PlaceDetailData[] = [projectDetail(lugar)]) {
    this.entregar?.(detalle)
  }

  fallaLaRed() {
    this.fallar?.(new Error('sin red'))
  }
}

async function ficha(repositorio: RepositorioConDetalleLento) {
  await renderWithCatalog(
    <PlaceDetail
      place={projectSummary(lugar)}
      plaza={plaza}
      backLabel="Volver"
      onBack={vi.fn()}
      onClose={vi.fn()}
    />,
    repositorio,
    { esperarDetalle: false },
  )
}

describe('la ficha mientras llega el detalle', () => {
  afterEach(async () => {
    await setLocale('es')
    vi.restoreAllMocks()
  })

  it('pinta lo del resumen al instante y marca con un esqueleto lo que falta, sin enlace a Maps', async () => {
    const repositorio = new RepositorioConDetalleLento()
    await ficha(repositorio)
    expect(screen.getByRole('heading', { level: 2, name: 'Café Aurora' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando los datos del lugar…')
    // "Cómo llegar" no se ofrece todavía: iría a la zona y, al llegar el detalle, cambiaría de destino.
    expect(screen.queryByRole('link', { name: /Cómo llegar/ })).toBeNull()
    expect(screen.queryByText('Café de especialidad.')).toBeNull()
    // Y no dice que falte información mientras no se sabe.
    expect(screen.queryByText(/Aún no tenemos más información/)).toBeNull()
  })

  it('al llegar el detalle aparecen la descripción y el enlace a la puerta del local, y el esqueleto se va', async () => {
    const repositorio = new RepositorioConDetalleLento()
    await ficha(repositorio)
    await act(async () => repositorio.llega())
    expect(await screen.findByText('Café de especialidad.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('link', { name: /Cómo llegar a Café Aurora/ })).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/abc123',
    )
    expect(screen.getByRole('link', { name: 'Sitio web' })).toBeInTheDocument()
  })

  it('si el detalle llegó pero no trae a este lugar, la ficha se queda con el resumen y no espera nada', async () => {
    const repositorio = new RepositorioConDetalleLento()
    await ficha(repositorio)
    await act(async () => repositorio.llega([]))
    expect(await screen.findByText(/Aún no tenemos más información/)).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    // Sin su punto propio, "Cómo llegar" va a la zona, que siempre es correcta.
    expect(screen.getByRole('link', { name: /Cómo llegar a Plaza Norte/ })).toBeInTheDocument()
  })

  it('si el detalle falla, avisa dentro de la ficha, deja llegar a la zona y deja reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositorio = new RepositorioConDetalleLento()
    await ficha(repositorio)
    await act(async () => repositorio.fallaLaRed())
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent(
      'No pudimos cargar la descripción ni los enlaces de este lugar.',
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Café Aurora' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cómo llegar a Plaza Norte/ })).toBeInTheDocument()

    // Reintentar vuelve a pedir el detalle de verdad, y si esta vez llega, la ficha se completa.
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(repositorio.pedidos).toBe(2)
    await act(async () => repositorio.llega())
    expect(await screen.findByText('Café de especialidad.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('en inglés el aviso y el reintento se dicen en inglés', async () => {
    await setLocale('en')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositorio = new RepositorioConDetalleLento()
    await ficha(repositorio)
    await act(async () => repositorio.fallaLaRed())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t load this place’s description or links.',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
