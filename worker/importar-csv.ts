/**
 * Importar locales desde un CSV, pasando cada fila por `prepararNegocio`: el mismo camino que el formulario
 * del panel, con las mismas reglas (títulos únicos, tope de 60 caracteres, plaza activa, procedencia).
 *
 * Es pura: recibe las filas y los archivos y devuelve el resultado por fila y los archivos nuevos. La usan
 * el script `data:import` y, más adelante, la carga masiva del panel.
 *
 * Las filas se procesan **en cadena**: cada una ve lo que dejaron las anteriores. Cuatro OXXO en el mismo
 * archivo producen cuatro títulos "OXXO en …" que tienen que caber y ser distintos entre sí, y eso solo se
 * sabe si la segunda fila conoce a la primera.
 *
 * Todo o nada: si una fila falla, no se devuelve ningún archivo, para no dejar una importación a medias.
 */
import { type CsvRow, filaAEntrada } from '../src/data/csv-negocio.ts'
import { type CommercialDataset, syncPlazaDerivedFields } from '../src/data/relations.ts'
import { normalizeText } from '../src/lib/text.ts'
import type { Place } from '../src/types/domain.ts'
import { type Cargado, prepararNegocio } from './contenido.ts'

export interface ResultadoFila {
  /** La línea en el archivo, contando el encabezado como la 1. */
  linea: number
  nombre: string
  ok: boolean
  nuevo: boolean
  id: string | null
  problemas: string[]
  avisos: string[]
  /** Lo que esta fila afirma de sí misma: la marca en el lugar y el estado con que queda. */
  afirma: string[]
}

export interface ResultadoImportacion {
  ok: boolean
  filas: ResultadoFila[]
  creados: number
  actualizados: number
  /** Los archivos nuevos. Solo si todas las filas pasaron. */
  archivos: { lugares: Record<string, unknown>; plazas: Record<string, unknown> } | null
  dataset: CommercialDataset
}

// La misma comparación que usa el adaptador para decir que dos filas son el mismo local: "Café X" y "Cafe X" lo son.
const claveDe = (place: Place) => `${place.plazaId}|${normalizeText(place.name)}`

export function importarFilas(
  filas: CsvRow[],
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  hoy: string,
): ResultadoImportacion {
  let actual = dataset
  let crudoActual = crudo
  const resultados: ResultadoFila[] = []
  const vistas = new Set<string>()
  let creados = 0
  let actualizados = 0

  filas.forEach((fila, indice) => {
    const linea = indice + 2
    const base: ResultadoFila = {
      linea,
      nombre: fila.name?.trim() ?? '',
      ok: false,
      nuevo: false,
      id: null,
      problemas: [],
      avisos: [],
      afirma: [],
    }
    const convertida = filaAEntrada(fila, actual)
    base.avisos.push(...convertida.avisos)
    if (!convertida.entrada) {
      resultados.push({ ...base, problemas: convertida.problemas })
      return
    }
    const preparado = prepararNegocio(actual, crudoActual, convertida.entrada, hoy)
    if (!preparado.ok) {
      resultados.push({ ...base, problemas: preparado.problemas })
      return
    }
    const place = preparado.place
    const clave = claveDe(place)
    if (vistas.has(clave)) {
      resultados.push({
        ...base,
        id: place.id,
        problemas: [`Repetida en el archivo: "${place.name}" ya salió antes en esta plaza.`],
      })
      return
    }
    vistas.add(clave)

    const places = preparado.nuevo
      ? [...actual.places, place]
      : actual.places.map((otro) => (otro.id === place.id ? place : otro))
    actual = { ...actual, places, plazas: syncPlazaDerivedFields({ ...actual, places }) }
    crudoActual = { ...crudoActual, places: preparado.lugares, plazas: preparado.plazas }
    if (preparado.nuevo) creados++
    else actualizados++

    const afirma: string[] = []
    const previa = convertida.existente?.verification
    const verification = place.verification
    if (verification && verification.status !== previa?.status) {
      afirma.push(`estado "${verification.status}"`)
    }
    if (
      verification?.sources.some((fuente) => fuente === `campo:${hoy}`) &&
      !previa?.sources.includes(`campo:${hoy}`)
    ) {
      afirma.push(`campo:${hoy} (comprobado en el lugar)`)
    }
    resultados.push({
      ...base,
      ok: true,
      nuevo: preparado.nuevo,
      id: place.id,
      avisos: [...base.avisos, ...preparado.avisos],
      afirma,
    })
  })

  const ok = resultados.every((resultado) => resultado.ok)
  return {
    ok,
    filas: resultados,
    creados,
    actualizados,
    archivos: ok ? { lugares: crudoActual.places, plazas: crudoActual.plazas } : null,
    dataset: actual,
  }
}
