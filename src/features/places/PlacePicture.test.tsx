// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { categoriesFixture } from '../../test/fixtures.ts'
import type { Photo } from '../../types/domain.ts'
import { PlacePicture } from './PlacePicture.tsx'

const categoria = categoriesFixture[0]
const foto = (src: string, alt: string): Photo => ({ src, alt, width: 1000, height: 1000 })
const ILUSTRACION = /Ilustración de la categoría/

/** Lo que ve quien abre una ficha cuando la imagen de portada no llega: la ilustración de su categoría. */
describe('PlacePicture', () => {
  it('con foto, pinta la imagen y no la ilustración', () => {
    render(
      <PlacePicture
        photo={foto('images/places/uno/portada.webp', 'Logo de Uno')}
        category={categoria}
        sizes="88px"
      />,
    )
    expect(screen.getByRole('img', { name: 'Logo de Uno' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: ILUSTRACION })).not.toBeInTheDocument()
  })

  it('si la imagen no carga, cae a la ilustración de la categoría', () => {
    render(
      <PlacePicture
        photo={foto('images/places/uno/portada.webp', 'Logo de Uno')}
        category={categoria}
        sizes="88px"
      />,
    )
    fireEvent.error(screen.getByRole('img', { name: 'Logo de Uno' }))
    expect(screen.queryByRole('img', { name: 'Logo de Uno' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: ILUSTRACION })).toBeInTheDocument()
  })

  it('una imagen rota no oculta la siguiente de la galería', () => {
    const { rerender } = render(
      <PlacePicture
        photo={foto('images/places/uno/a.webp', 'A')}
        category={categoria}
        sizes="88px"
      />,
    )
    fireEvent.error(screen.getByRole('img', { name: 'A' }))
    expect(screen.getByRole('img', { name: ILUSTRACION })).toBeInTheDocument()

    rerender(
      <PlacePicture
        photo={foto('images/places/uno/b.webp', 'B')}
        category={categoria}
        sizes="88px"
      />,
    )
    expect(screen.getByRole('img', { name: 'B' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: ILUSTRACION })).not.toBeInTheDocument()
  })

  it('sin foto, la ilustración va directa', () => {
    render(<PlacePicture photo={undefined} category={categoria} sizes="88px" />)
    expect(screen.getByRole('img', { name: ILUSTRACION })).toBeInTheDocument()
  })

  it('en tamaño pequeño la ilustración es decorativa y no se anuncia', () => {
    render(
      <PlacePicture
        photo={foto('images/places/uno/portada.webp', 'Logo de Uno')}
        category={categoria}
        sizes="64px"
        illustrationSize="sm"
      />,
    )
    fireEvent.error(screen.getByRole('img', { name: 'Logo de Uno' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
