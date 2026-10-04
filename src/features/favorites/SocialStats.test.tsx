// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SocialStats } from './SocialStats.tsx'
import { setSocialStatsSource } from './socialStats.ts'

afterEach(() => setSocialStatsSource(null))

describe('SocialStats', () => {
  it('sin fuente registrada no dibuja nada (la guía estática de hoy)', () => {
    const { container } = render(<SocialStats placeId="cafe-aurora" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra los corazones, nunca la media de estrellas', () => {
    setSocialStatsSource({
      get: (placeId) =>
        placeId === 'cafe-aurora' ? { favorites: 12, rating: { average: 4.62, count: 30 } } : null,
    })
    render(<SocialStats placeId="cafe-aurora" />)
    expect(screen.getByText('12 personas lo guardaron')).toBeInTheDocument()
    // La media alimenta el orden personal, pero no se publica junto al nombre del negocio.
    expect(screen.queryByText('4.6')).not.toBeInTheDocument()
    expect(screen.queryByText('30 valoraciones')).not.toBeInTheDocument()
  })

  it('no muestra secciones vacías cuando aún no hay datos suficientes', () => {
    setSocialStatsSource({ get: () => ({ favorites: 0, rating: null }) })
    const { container } = render(<SocialStats placeId="cafe-aurora" />)
    expect(container).toBeEmptyDOMElement()
  })
})
