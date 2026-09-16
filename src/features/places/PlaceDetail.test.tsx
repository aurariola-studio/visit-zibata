// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makePlace, plazasFixture } from '../../test/fixtures.ts'
import { renderWithCatalog } from '../../test/render.tsx'
import type { Place } from '../../types/domain.ts'
import { PlaceDetail } from './PlaceDetail.tsx'

const plaza = plazasFixture[0] as (typeof plazasFixture)[number]

async function setup(place: Place) {
  const props = {
    place,
    plaza,
    backLabel: 'Volver a Plaza Norte',
    onBack: vi.fn(),
    onClose: vi.fn(),
  }
  await renderWithCatalog(<PlaceDetail {...props} />)
  return props
}

describe('PlaceDetail', () => {
  it('muestra la información básica y el botón Cómo llegar a Google Maps', async () => {
    await setup(
      makePlace({
        id: 'cafe-aurora',
        plazaId: plaza.id,
        name: 'Café Aurora',
        category: 'desayunos-y-cafe',
        localNumber: '4',
      }),
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Café Aurora' })).toHaveFocus()
    expect(screen.getByText('Plaza Norte · Local 4')).toBeInTheDocument()
    const directions = screen.getByRole('link', { name: /Cómo llegar/ })
    expect(directions).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=20.68%2C-100.32',
    )
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sin datos adicionales no muestra botones vacíos y lo indica', async () => {
    await setup(makePlace({ id: 'x', plazaId: plaza.id, name: 'Sin datos' }))
    expect(screen.queryByRole('heading', { name: 'Contacto y redes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Horario' })).not.toBeInTheDocument()
    expect(screen.getByText('Aún no tenemos más información de este lugar.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Ilustración de la categoría/ })).toBeInTheDocument()
  })

  it('muestra solo los enlaces disponibles', async () => {
    await setup(
      makePlace({
        id: 'x',
        plazaId: plaza.id,
        name: 'Con redes',
        phone: '+524421234567',
        links: {
          website: 'https://ejemplo.mx',
          instagram: 'https://www.instagram.com/ejemplo/',
          facebook: null,
          tiktok: null,
          whatsapp: '+524421234567',
        },
      }),
    )
    const contact = screen.getByRole('list')
    const links = within(contact).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Llamar',
      'WhatsApp',
      'Sitio web',
      'Instagram',
    ])
    expect(screen.getByRole('link', { name: 'Llamar' })).toHaveAttribute(
      'href',
      'tel:+524421234567',
    )
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/524421234567',
    )
    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument()
  })

  it('muestra descripción, horario agrupado y fotos', async () => {
    await setup(
      makePlace({
        id: 'x',
        plazaId: plaza.id,
        name: 'Completo',
        description: 'Pan de masa madre.',
        hours: {
          mon: ['08:00-14:00'],
          tue: ['08:00-14:00'],
          sun: [],
          note: 'Horario de temporada',
        },
        photos: [
          { src: 'images/places/x/fachada.webp', alt: 'Fachada del local' },
          { src: 'images/places/x/barra.webp', alt: 'Barra de café' },
        ],
      }),
    )
    expect(screen.getByText('Pan de masa madre.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Horario' })).toBeInTheDocument()
    expect(screen.getByText('Lun–Mar')).toBeInTheDocument()
    expect(screen.getByText('08:00–14:00')).toBeInTheDocument()
    expect(screen.getByText('Horario de temporada')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ver foto ampliada: Fachada del local' }),
    ).toBeInTheDocument()
    const [hero, firstThumb] = screen.getAllByRole('img', { name: 'Fachada del local' })
    expect(hero).toHaveAttribute('loading', 'eager')
    expect(firstThumb).toHaveAttribute('loading', 'lazy')
    expect(screen.getByRole('button', { name: 'Foto 2 de 2' })).toBeInTheDocument()
  })

  it('vuelve atrás y cierra', async () => {
    const props = await setup(makePlace({ id: 'x', plazaId: plaza.id, name: 'Lugar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Volver a Plaza Norte' }))
    expect(props.onBack).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(props.onClose).toHaveBeenCalled()
  })
})
