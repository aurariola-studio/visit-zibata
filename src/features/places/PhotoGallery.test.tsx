// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PhotoGallery } from './PhotoGallery.tsx'

const photos = [
  { src: 'images/places/prueba/rota.webp', alt: 'Foto rota' },
  { src: 'images/places/prueba/buena.webp', alt: 'Foto buena' },
]

describe('PhotoGallery', () => {
  it('una foto rota muestra la ilustración sin ocultar las fotos siguientes', async () => {
    render(
      <PhotoGallery
        photos={photos}
        categoryId="pizza"
        categoryIcon="pizza"
        categoryLabel="Pizza"
      />,
    )
    const brokenHero = screen.getByRole('button', { name: 'Ver foto ampliada: Foto rota' })
    fireEvent.error(within(brokenHero).getByRole('img', { name: 'Foto rota' }))
    expect(
      within(brokenHero).getByRole('img', { name: 'Ilustración de la categoría Pizza' }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Foto 2 de 2' }))
    const hero = screen.getByRole('button', { name: 'Ver foto ampliada: Foto buena' })
    expect(within(hero).getByRole('img', { name: 'Foto buena' })).toBeInTheDocument()
  })
})
