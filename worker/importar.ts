/**
 * Carga masiva de locales desde el panel: se pega o sube un CSV, se ve fila por fila qué pasaría y, solo
 * entonces, se manda a la PR.
 *
 * Es el mismo ejecutor que usa `npm run data:import` (`importar-csv.ts`) y, por debajo, el mismo
 * `prepararNegocio` que el formulario: no hay reglas propias de la carga masiva. En dos pasos como cualquier
 * escritura del panel: sin `confirmar` solo calcula y devuelve cada fila; con `confirmar`, lo repite sobre lo
 * que haya ahora en la rama (puede haber cambiado) y publica los dos archivos juntos, en un solo commit.
 *
 * **Todo o nada.** Si una fila falla, no se publica nada: una importación a medias deja una PR que nadie sabe
 * qué filas trae. Cada fila declara su propia procedencia (`fuentes`, `comprobado`); no hay una casilla para
 * toda la tanda, que sería el sello automático que la Fase 5 quitó.
 */
import Papa from 'papaparse'
import { z } from 'zod'
import { CSV_COLUMNS, type CsvRow } from '../src/data/csv-negocio.ts'
import type { CommercialDataset } from '../src/data/relations.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, cargar } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'
import { importarFilas, type ResultadoFila } from './importar-csv.ts'

/**
 * Cada fila revalida el conjunto entero. Cien filas son unos cientos de milisegundos; más que eso se parte en
 * dos archivos, que además da dos PR que se pueden revisar.
 */
export const TOPE_DE_FILAS = 100
export const TOPE_DE_BYTES_CSV = 256 * 1024

export const EntradaImportarSchema = z.strictObject({
  csv: z.string().max(TOPE_DE_BYTES_CSV, 'El archivo es demasiado grande'),
  /** Sin esto, solo se calcula lo que pasaría. */
  confirmar: z.boolean().optional().default(false),
})

export interface Vista {
  /** Todas las filas pasaron: se puede confirmar. */
  listo: boolean
  filas: ResultadoFila[]
  creados: number
  actualizados: number
  columnasIgnoradas: string[]
}

export type Preparada =
  | {
      ok: true
      vista: Vista
      archivos: { lugares: Record<string, unknown>; plazas: Record<string, unknown> } | null
    }
  | { ok: false; problemas: string[] }

/** La parte pura: lee el CSV, pasa cada fila por `prepararNegocio` y deja los archivos listos si todas pasan. */
export function prepararImportacion(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  csv: string,
  hoy: string,
): Preparada {
  const leido = Papa.parse<CsvRow>(csv.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (encabezado) => encabezado.trim(),
  })
  if (leido.errors.length > 0) {
    return {
      ok: false,
      problemas: leido.errors.map(
        (error) => `Fila ${(error.row ?? 0) + 2} del archivo: ${error.message}`,
      ),
    }
  }
  const campos = leido.meta.fields ?? []
  for (const obligatorio of ['name', 'plaza']) {
    if (!campos.includes(obligatorio)) {
      return {
        ok: false,
        problemas: [`Falta la columna "${obligatorio}" en el encabezado del archivo.`],
      }
    }
  }
  if (leido.data.length === 0) return { ok: false, problemas: ['El archivo no trae ninguna fila.'] }
  if (leido.data.length > TOPE_DE_FILAS) {
    return {
      ok: false,
      problemas: [
        `El archivo trae ${leido.data.length} filas y el tope son ${TOPE_DE_FILAS}. Pártelo en dos.`,
      ],
    }
  }

  const resultado = importarFilas(leido.data, dataset, crudo, hoy)
  return {
    ok: true,
    archivos: resultado.archivos,
    vista: {
      listo: resultado.ok,
      filas: resultado.filas,
      creados: resultado.creados,
      actualizados: resultado.actualizados,
      columnasIgnoradas: campos.filter(
        (campo) => !(CSV_COLUMNS as readonly string[]).includes(campo),
      ),
    },
  }
}

export type ResultadoImportar =
  | {
      ok: true
      /** `true` si esta llamada guardó (o validó en seco); `false` si solo calculó lo que pasaría. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      vista: Vista
    }
  | { ok: false; problemas: string[] }

export async function guardarImportacion(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoImportar> {
  const entrada = EntradaImportarSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  const cargado = await cargar(entorno)
  const preparada = prepararImportacion(
    cargado.dataset,
    cargado.crudo,
    entrada.data.csv,
    fechaLocal(new Date()),
  )
  if (!preparada.ok) return preparada

  const base = { seco: cargado.seco, vista: preparada.vista }
  if (!entrada.data.confirmar) {
    return {
      ok: true,
      confirmado: false,
      pr: null,
      mensaje: 'Esto es lo que pasaría. No se ha guardado nada.',
      ...base,
    }
  }
  if (!preparada.archivos) {
    const malas = preparada.vista.filas.filter((fila) => !fila.ok).length
    return {
      ok: false,
      problemas: [
        `${malas} ${malas === 1 ? 'fila tiene' : 'filas tienen'} errores: se importa todo o nada. Corrígelas y vuelve a ver lo que pasaría.`,
      ],
    }
  }
  if (cargado.seco) {
    return {
      ok: true,
      confirmado: true,
      pr: null,
      mensaje: 'Importación validada. En desarrollo no se commitea.',
      ...base,
    }
  }

  const { creados, actualizados } = preparada.vista
  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/commercial/places.json',
        contenido: `${JSON.stringify(preparada.archivos.lugares, null, 2)}\n`,
      },
      {
        ruta: 'data/commercial/plazas.json',
        contenido: `${JSON.stringify(preparada.archivos.plazas, null, 2)}\n`,
      },
    ],
    `Panel: importar locales desde CSV (${creados} nuevos, ${actualizados} actualizados)`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Importación enviada a la PR.',
    vista: preparada.vista,
  }
}
