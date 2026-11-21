import { describe, expect, it } from 'vitest'
import lugaresJson from '../../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../../data/commercial/plazas.json' with { type: 'json' }
import redirectsJson from '../../data/commercial/redirects.json' with { type: 'json' }

/**
 * La convención de las direcciones de los locales (docs/DATOS.md): una sola sucursal lleva el nombre limpio, y la zona
 * va como sufijo solo cuando hay otra sucursal. Esta prueba existe porque la primera investigación pegó la zona o la
 * ciudad a muchos slugs que no la necesitaban (`wake-cup-xentric-anahuac`, `burgerthoven-zibata`), y se limpiaron a
 * mano en dos tandas: sin una prueba, el siguiente local nuevo con ese sufijo se colaría sin que nadie lo viera.
 *
 * Recorre los datos reales y no nombra ningún negocio.
 */
const lugares = lugaresJson.places
const zonas = plazasJson.plazas.map((plaza) => plaza.id)

const sinAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
const palabras = (texto: string) =>
  sinAcentos(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** El sufijo de ubicación de un slug, si lo lleva: la ciudad, la zona abreviada o el id de una zona. */
const SUFIJO = new RegExp(`-(${['zibata', 'anahuac', 'queretaro', ...zonas].join('|')})$`)

describe('direcciones de los locales', () => {
  it('un local de una sola sucursal no lleva la zona o la ciudad pegada a su dirección', () => {
    const sobrantes = lugares.filter((lugar) => {
      const sufijo = SUFIJO.exec(lugar.slug)?.[1]
      if (!sufijo) return false
      // El nombre del propio negocio ya lleva la ubicación ("... Zibatá", "... Centro Zibatá"): la dirección le sigue.
      const delNombre = new Set(palabras(lugar.name))
      if (sufijo.split('-').every((parte) => delNombre.has(parte))) return false
      // Hay otra sucursal con el mismo nombre o con la misma base: el sufijo es lo que las distingue.
      const base = lugar.slug.replace(SUFIJO, '')
      const hermana = lugares.some(
        (otro) =>
          otro.id !== lugar.id &&
          (otro.slug === base ||
            otro.slug.startsWith(`${base}-`) ||
            palabras(otro.name).join(' ') === palabras(lugar.name).join(' ')),
      )
      return !hermana
    })
    expect(
      sobrantes.map((lugar) => lugar.slug),
      'Quita el sufijo con el cambio de dirección (slug nuevo y fila place-slug en redirects.json); el id no cambia',
    ).toEqual([])
  })

  it('si un negocio tiene varias sucursales, todas llevan la zona en su dirección (ninguna es la "limpia")', () => {
    // La zona de la Universidad Anáhuac se abrevia `-anahuac`; las demás van con su id.
    const sufijoDeZona = (plazaId: string) =>
      plazaId === 'anahuac-queretaro' ? 'anahuac' : plazaId
    const porNombre = new Map<string, typeof lugares>()
    for (const lugar of lugares) {
      const clave = palabras(lugar.name).join(' ')
      porNombre.set(clave, [...(porNombre.get(clave) ?? []), lugar])
    }
    const sinZona = [...porNombre.values()]
      .filter((grupo) => grupo.length > 1)
      .flat()
      .filter((lugar) => !lugar.slug.endsWith(`-${sufijoDeZona(lugar.plazaId)}`))
    expect(
      sinZona.map((lugar) => lugar.slug),
      'Con varias sucursales todas llevan el sufijo de su zona: cambia la dirección de la que no lo lleva (slug nuevo y fila place-slug)',
    ).toEqual([])
  })

  it('cada dirección antigua de redirects.json apunta a un local que existe', () => {
    const ids = new Set(lugares.map((lugar) => lugar.id))
    const colgadas = redirectsJson.redirects
      .filter((fila) => fila.kind === 'place-slug')
      .filter((fila) => !ids.has(fila.id))
    expect(colgadas).toEqual([])
  })
})
