// @vitest-environment node
import { readFileSync } from 'node:fs'
import * as turf from '@turf/turf'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { puntoInterior } from '../../../src/data/geometria.ts'
import { paths } from './paths.ts'

/**
 * Ata el selector de edificios del panel a la regla de `map:build`.
 *
 * El panel manda un punto dentro de la huella que se pulsó, y `map:build` (`Ajustador`) lo resuelve con
 * `booleanPointInPolygon` contra las huellas CRUDAS de Overture: tiene que caer en exactamente una. Si el
 * punto que calcula `puntoInterior` no cumple eso con los datos reales, el primer aviso sería un CI rojo en la
 * PR del panel, que bloquea todo lo demás que lleva. Aquí se comprueba antes, con cada edificio real de las
 * plazas. Los volúmenes sintéticos no cuentan: `build-map` los pone en lugar de las huellas reales de esa plaza
 * (`replaceExisting`), así que ajustar uno no cambiaría nada y `Ajustador` lo da por error; el panel los rechaza.
 */

const leer = <T>(ruta: string): T => JSON.parse(readFileSync(ruta, 'utf8')) as T

const plazas = leer<
  FeatureCollection<Polygon | MultiPolygon, { id: number; src: string; plazaId: string }>
>(paths.plazaBuildings)
const crudo = leer<FeatureCollection<Polygon | MultiPolygon>>(paths.rawBuildings)

const poligonosDe = (g: Polygon | MultiPolygon): number[][][][] =>
  g.type === 'Polygon' ? [g.coordinates] : g.coordinates

const reales = plazas.features.filter((f) => f.properties.src !== 'synthetic')

/** Cuántas huellas crudas contienen el punto. */
const huellasEn = (lng: number, lat: number): number =>
  crudo.features.filter((huella) => turf.booleanPointInPolygon([lng, lat], huella)).length

describe('el punto que manda el panel resuelve a una sola huella en el crudo', () => {
  it('hay edificios reales con los que probar', () => {
    expect(reales.length).toBeGreaterThan(10)
  })

  it('cada edificio real de las plazas: el punto cae en exactamente una huella, y no al filo', () => {
    const fallos: string[] = []
    for (const edificio of reales) {
      for (const poligono of poligonosDe(edificio.geometry)) {
        const punto = puntoInterior(poligono)
        const nombre = `${edificio.properties.plazaId} #${edificio.properties.id} (${edificio.properties.src})`
        if (!punto) {
          fallos.push(`${nombre}: sin punto interior`)
          continue
        }
        const cuantas = huellasEn(punto.lng, punto.lat)
        if (cuantas !== 1) fallos.push(`${nombre}: el punto cae en ${cuantas} huellas`)
        // Menos de 1 m al borde es un punto que la simplificación de las teselas puede dejar fuera.
        if (punto.margenM < 1)
          fallos.push(`${nombre}: a solo ${punto.margenM.toFixed(2)} m del borde`)
      }
    }
    expect(fallos).toEqual([])
  })

  it('un edificio cóncavo (mol-jamadi, 9119) también', () => {
    const jamadi = reales.find((f) => f.properties.id === 9119)
    if (!jamadi) throw new Error('mol-jamadi #9119 ya no está en plaza-buildings.geojson')
    const punto = puntoInterior(poligonosDe(jamadi.geometry)[0] ?? [])
    expect(punto).not.toBeNull()
    expect(huellasEn(punto?.lng ?? 0, punto?.lat ?? 0)).toBe(1)
  })

  it('hay volúmenes sintéticos en las plazas: por eso el panel tiene que distinguirlos', () => {
    const sinteticos = plazas.features.filter((f) => f.properties.src === 'synthetic')
    expect(sinteticos.length).toBeGreaterThan(0)
    // Cada uno marca su plaza: el panel lee `src` de la propia tesela y rechaza `synthetic`.
    for (const volumen of sinteticos) expect(volumen.properties.plazaId).toBeTruthy()
  })
})
