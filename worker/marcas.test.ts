import { describe, expect, it } from 'vitest'
import { LUGARES } from './catalogo.ts'
import {
  calificacionesDe,
  esFechaVisitable,
  MARCAR_VISITA,
  MAXIMO_POR_PETICION,
  MIS_NOTAS,
  PONER_NOTA,
  visitasDe,
} from './marcas.ts'

describe('las calificaciones que acepta el servidor', () => {
  it('acepta la escala de la interfaz, de media en media', () => {
    expect(calificacionesDe({ notas: { tomassa: 4.5 } })?.notas).toEqual({ tomassa: 4.5 })
    expect(calificacionesDe({ notas: { tomassa: 0.5 } })?.notas).toEqual({ tomassa: 0.5 })
  })

  it('un null borra la nota, que es lo que hace volver a pulsar la misma', () => {
    expect(calificacionesDe({ notas: { tomassa: null } })?.notas).toEqual({ tomassa: null })
  })

  it('filtra lo que no es una nota en vez de tirar el gesto entero', () => {
    const cambio = calificacionesDe({
      notas: { tomassa: 4, 'NO-ES-SLUG': 4, otro: 4.2, tercero: 7, cuarto: 0, quinto: '5' },
    })
    // 4,2 no está en la escala, 7 se sale, 0 no existe y "5" no es un número.
    expect(cambio?.notas).toEqual({ tomassa: 4 })
  })

  it('rechaza lo que no es un cambio', () => {
    for (const malo of [null, 'texto', 42, [], {}, { notas: null }, { notas: {} }]) {
      expect(calificacionesDe(malo)).toBeNull()
    }
  })

  it('pone un tope por petición', () => {
    // Con lugares reales: uno inventado se filtraría solo y el tope no llegaría a probarse.
    const reales = [...LUGARES].slice(0, MAXIMO_POR_PETICION + 1)
    expect(reales).toHaveLength(MAXIMO_POR_PETICION + 1)
    const muchas = Object.fromEntries(reales.map((id) => [id, 4]))
    expect(calificacionesDe({ notas: muchas })).toBeNull()
  })

  it('una nota solo vale sobre un lugar del catálogo; borrarla vale sobre cualquiera', () => {
    const cambio = calificacionesDe({
      notas: { tomassa: 5, 'lugar-inventado': 5, 'lugar-que-ya-no-existe': null },
    })
    expect(cambio?.notas).toEqual({ tomassa: 5, 'lugar-que-ya-no-existe': null })
    // Solo un slug inventado deja la petición sin nada que guardar.
    expect(calificacionesDe({ notas: { 'lugar-inventado': 5 } })).toBeNull()
  })

  it('un slug como `constructor` no toca nada heredado', () => {
    expect(
      calificacionesDe({ notas: { constructor: 5, __proto__: 5, tomassa: 4 } })?.notas,
    ).toEqual({
      tomassa: 4,
    })
  })

  it('volver a calificar sustituye, no acumula un historial de notas', () => {
    expect(PONER_NOTA).toContain('ON CONFLICT(cuenta_id, lugar_id) DO UPDATE')
  })
})

describe('las visitas que acepta el servidor', () => {
  it('acepta la lista entera de un lugar', () => {
    expect(visitasDe({ fechas: { tomassa: ['2026-10-01', '2026-10-05'] } })?.fechas).toEqual({
      tomassa: ['2026-10-01', '2026-10-05'],
    })
  })

  it('filtra lo que no es una fecha y no repite', () => {
    const cambio = visitasDe({
      fechas: { tomassa: ['2026-10-01', '2026-10-01', 'ayer', 42, '2026-13-99x'] },
    })
    expect(cambio?.fechas).toEqual({ tomassa: ['2026-10-01'] })
  })

  it('descarta las fechas con forma pero sin día, las de antes de la guía y las del futuro', () => {
    const ahora = new Date('2026-11-04T12:00:00Z')
    const cambio = visitasDe(
      {
        fechas: {
          tomassa: [
            '9999-99-99',
            '2026-02-31',
            '2026-13-01',
            '2019-05-05',
            '2099-01-01',
            '2026-11-06',
            '2026-11-05',
            '2026-10-31',
          ],
        },
      },
      ahora,
    )
    // Queda el día de mañana (un día de margen por los husos) y el pasado reciente.
    expect(cambio?.fechas).toEqual({ tomassa: ['2026-11-05', '2026-10-31'] })
  })

  it('solo guarda visitas de lugares del catálogo', () => {
    const cambio = visitasDe({
      fechas: { tomassa: ['2026-10-01'], 'lugar-inventado': ['2026-10-01'] },
    })
    expect(Object.keys(cambio?.fechas ?? {})).toEqual(['tomassa'])
    expect(visitasDe({ fechas: { 'lugar-inventado': ['2026-10-01'] } })).toBeNull()
  })

  it('esFechaVisitable acepta bisiestos reales y rechaza los que no lo son', () => {
    const ahora = new Date('2028-06-01T00:00:00Z')
    expect(esFechaVisitable('2028-02-29', ahora)).toBe(true)
    expect(esFechaVisitable('2027-02-29', ahora)).toBe(false)
  })

  it('rechaza lo que no es un cambio, y un lugar sin fechas no cuenta', () => {
    for (const malo of [null, 'texto', { fechas: {} }, { fechas: { tomassa: [] } }]) {
      expect(visitasDe(malo)).toBeNull()
    }
  })

  it('reenviar la misma fecha no crea dos filas ni falla', () => {
    expect(MARCAR_VISITA).toContain('INSERT OR IGNORE')
  })
})

describe('lo que no se guarda', () => {
  it('ni de la persona ni de su dispositivo', () => {
    const sql = [PONER_NOTA, MARCAR_VISITA, MIS_NOTAS].join(' ').toLowerCase()
    for (const prohibido of ['ip', 'user_agent', 'correo', 'email', 'nombre', 'referente']) {
      expect(sql).not.toContain(prohibido)
    }
  })
})
