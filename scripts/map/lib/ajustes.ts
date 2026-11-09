/**
 * Aplica los ajustes de edificios (`data/geographic/ajustes-edificios.json`) a las huellas.
 *
 * Es una función pura sobre polígonos: `build-map.ts` le pregunta por cada huella que va a emitir y, al
 * final, pide los ajustes que no se resolvieron. Una huella oculta se descarta ANTES de asignarle id, así
 * que desaparece de las teselas, de `edificios-base.geojson` (y por tanto de las mallas) y de las plazas.
 */
import * as turf from '@turf/turf'
import type { MultiPolygon, Polygon } from 'geojson'
import type { AjusteEdificio } from '../../../src/data/ajustes-edificios.ts'

export interface Resultado {
  ocultar: boolean
  /** Metros fijados a mano; `build-mallas` no los mezcla ni los redondea a pisos. */
  alturaFijaM?: number
}

export class Ajustador {
  /** Por cada ajuste, los ids de Overture de las huellas que contienen su punto. */
  private readonly aciertos: string[][]
  private readonly ajustes: readonly AjusteEdificio[]

  constructor(ajustes: readonly AjusteEdificio[]) {
    this.ajustes = ajustes
    this.aciertos = ajustes.map(() => [])
  }

  /**
   * Qué hay que hacer con esta huella. Si dos ajustes caen en la misma se combinan aquí, pero
   * `problemas()` lo da por error: el mapa no se da por bueno.
   */
  para(polygon: Polygon | MultiPolygon, overtureId: string): Resultado | null {
    let resultado: Resultado | null = null
    this.ajustes.forEach((ajuste, i) => {
      const punto: [number, number] = [ajuste.punto.lng, ajuste.punto.lat]
      if (!turf.booleanPointInPolygon(punto, polygon)) return
      this.aciertos[i]?.push(overtureId)
      resultado = {
        ...(resultado ?? { ocultar: false }),
        ...(ajuste.accion === 'ocultar' ? { ocultar: true } : { alturaFijaM: ajuste.alturaM }),
      }
    })
    return resultado
  }

  /**
   * Lo que impide dar el mapa por bueno: un ajuste sin huella, con varias, con otro id del esperado, o dos
   * ajustes sobre la misma huella. Vacío si todo se aplicó.
   */
  problemas(): string[] {
    const salida: string[] = []
    const porHuella = new Map<string, number>()
    this.ajustes.forEach((ajuste, i) => {
      const donde = `(${ajuste.punto.lat}, ${ajuste.punto.lng})`
      const huellas = [...new Set(this.aciertos[i] ?? [])]
      if (huellas.length === 0) {
        salida.push(
          `Ajuste ${ajuste.accion} en ${donde}: el punto no cae dentro de ninguna huella. Se movió el crudo o el punto está mal.`,
        )
        return
      }
      if (huellas.length > 1) {
        salida.push(
          `Ajuste ${ajuste.accion} en ${donde}: el punto cae en ${huellas.length} huellas; tiene que ser exactamente una.`,
        )
        return
      }
      const [id] = huellas
      if (ajuste.overtureId && ajuste.overtureId !== id) {
        salida.push(
          `Ajuste ${ajuste.accion} en ${donde}: la huella hallada es ${id}, no ${ajuste.overtureId}. El crudo cambió.`,
        )
      }
      if (id) porHuella.set(id, (porHuella.get(id) ?? 0) + 1)
    })
    for (const [id, cuantos] of porHuella) {
      if (cuantos > 1) salida.push(`Hay ${cuantos} ajustes sobre la misma huella (${id}).`)
    }
    return salida
  }
}
