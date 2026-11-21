import { describe, expect, it } from 'vitest'
import { rechazoPorOrigen } from './edificios-mapa.ts'

describe('rechazoPorOrigen', () => {
  it('una huella de datos abiertos se puede ajustar', () => {
    expect(rechazoPorOrigen(['osm'])).toBeNull()
    expect(rechazoPorOrigen(['google', 'microsoft', undefined])).toBeNull()
    expect(rechazoPorOrigen([])).toBeNull()
  })

  it('un volumen de zona se rechaza, con su motivo', () => {
    expect(rechazoPorOrigen(['synthetic'])).toContain('volumen generado')
  })

  it('un edificio dibujado a mano se rechaza y dice dónde se cambia: ajustarlo rompería map:build', () => {
    const motivo = rechazoPorOrigen(['propio'])
    expect(motivo).toContain('volumenes-propios.json')
    expect(motivo).toContain('dibujado a mano')
  })

  it('si el punto toca varios, manda el primer motivo que aplique', () => {
    expect(rechazoPorOrigen(['osm', 'propio'])).toContain('dibujado a mano')
  })
})
