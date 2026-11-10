import { describe, expect, it } from 'vitest'
import { frase } from './mapa.ts'

describe('frase', () => {
  it('una versión nueva y una fijada retirada van en un bloque que llama la atención', () => {
    expect(
      frase({ estado: 'hay-nueva', fijada: '2026-10-21.0', ultima: '2026-11-18.0' }),
    ).toContain('class="pendiente"')
    expect(
      frase({ estado: 'fijada-retirada', fijada: '2026-07-01.0', ultima: '2026-10-21.0' }),
    ).toContain('class="pendiente"')
  })

  it('al día y desconocido van en una nota', () => {
    expect(
      frase({ estado: 'al-dia', fijada: '2026-10-21.0', ultima: '2026-10-21.0' }),
    ).not.toContain('pendiente')
    expect(frase({ estado: 'desconocido' })).not.toContain('pendiente')
  })

  it('lo que llega del servidor no se toma por marcado', () => {
    const html = frase({ estado: 'desconocido', motivo: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    const nueva = frase({ estado: 'hay-nueva', fijada: '<b>', ultima: '</p><script>' })
    expect(nueva).not.toContain('<script>')
    expect(nueva).not.toContain('<b>')
  })

  it('sin estado conocido no afirma que el mapa esté al día', () => {
    expect(frase({})).toContain('No se pudo comprobar')
    expect(frase({})).not.toContain('más reciente')
  })
})
