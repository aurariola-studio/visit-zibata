/**
 * Guardar el contorno de una plaza desde el panel.
 *
 * Como el borrado, va en dos pasos: sin `confirmar` solo se calcula el impacto; con `confirmar` se manda
 * a la PR del panel. Las reglas del contorno son las de `src/data/geometria.ts`, las mismas que aplica
 * `data:validate` en el CI, así que lo que el servidor acepta el build no lo rechaza.
 *
 * **Lo que cambia el commit es solo la `geometry` de esa plaza** (y `updatedAt`): el resto de
 * `plazas.json` queda igual, byte a byte. Hay una prueba que lo fija.
 *
 * El mapa no se toca aquí: desde la Fase 3a los edificios y las mallas de las plazas se derivan de
 * `plazas.json` en cada build, así que al fusionar la PR el despliegue dibuja el contorno nuevo.
 */
import { z } from 'zod'
import {
  areaM2,
  mismoContorno,
  normalizarContorno,
  validarContornoDePlaza,
} from '../src/data/geometria.ts'
import {
  type CommercialDataset,
  isInsidePlazaGeometry,
  validateRelations,
} from '../src/data/relations.ts'
import type { PlazaGeometry } from '../src/types/domain.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, CONTORNO_DE_ZIBATA, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

export const EntradaContornoSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta la plaza'),
  /** El polígono nuevo. Se valida con las reglas de `geometria.ts`, no con un esquema de Zod. */
  geometria: z.unknown(),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ImpactoContorno {
  plaza: { id: string; nombre: string }
  vertices: { antes: number; despues: number }
  /** m², redondeados al metro. */
  area: { antes: number; despues: number; cambio: number }
  locales: {
    /** Estaban dentro y con el contorno nuevo quedan fuera: lo que este cambio empeora. */
    quedanFuera: { id: string; nombre: string }[]
    /** Estaban fuera y con el nuevo vuelven a quedar dentro. */
    vuelvenDentro: { id: string; nombre: string }[]
    /** Ya estaban fuera antes y siguen fuera: no son culpa de este cambio. */
    siguenFuera: number
  }
  avisos: string[]
}

export type PreparadoContorno =
  | { ok: true; impacto: ImpactoContorno; plazas: Record<string, unknown> }
  | { ok: false; problemas: string[] }

const anilloDe = (geometria: { type: string; coordinates: unknown }): number[][] =>
  geometria.type === 'Polygon' ? ((geometria.coordinates as number[][][])[0] ?? []) : []

/** La parte pura: valida, calcula el impacto y deja `plazas.json` listo con solo esa geometría cambiada. */
export function prepararContorno(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoContorno {
  const entrada = EntradaContornoSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }

  const plaza = dataset.plazas.find((fila) => fila.id === entrada.data.id)
  if (!plaza) return { ok: false, problemas: ['Esa plaza ya no existe'] }
  if (plaza.geometry.type !== 'Polygon') {
    return {
      ok: false,
      problemas: ['Esta plaza tiene varias partes; solo se editan contornos de un polígono.'],
    }
  }

  const otras = dataset.plazas.flatMap((otra) =>
    otra.id !== plaza.id && otra.geometry.type === 'Polygon'
      ? [{ id: otra.id, anillo: anilloDe(otra.geometry) }]
      : [],
  )
  const rotos = validarContornoDePlaza(entrada.data.geometria, {
    contorno: CONTORNO_DE_ZIBATA,
    marcador: plaza.coordinates,
    otras,
  })
  if (rotos.length > 0) return { ok: false, problemas: rotos.map((problema) => problema.mensaje) }

  // Pasó las reglas: es un Polygon de un solo anillo cerrado. Se deja como lo guarda el dato.
  const nuevoAnillo = normalizarContorno(
    anilloDe(entrada.data.geometria as { type: string; coordinates: unknown }),
  )
  // Validado arriba: un Polygon de un solo anillo de pares [lng, lat], que es lo que pide el esquema.
  const geometry = {
    type: 'Polygon' as const,
    coordinates: [nuevoAnillo],
  } as unknown as PlazaGeometry
  const anillaAntes = anilloDe(plaza.geometry)
  // Un editor que carga un contorno y lo guarda sin tocarlo no debe producir un commit que solo le da la
  // vuelta al anillo o cambia su vértice de inicio.
  if (mismoContorno(anillaAntes, nuevoAnillo)) {
    return {
      ok: false,
      problemas: ['El contorno es el mismo que ya tiene la plaza: no hay nada que guardar.'],
    }
  }

  const despues: CommercialDataset = {
    ...dataset,
    plazas: dataset.plazas.map((fila) => (fila.id === plaza.id ? { ...fila, geometry } : fila)),
  }
  // La misma validación del build: un error nuevo aquí es una PR que el CI tumbaría.
  const problemas = validateRelations(despues, LIMITES)
    .filter((asunto) => asunto.level === 'error')
    .map((asunto) => asunto.message)
  if (problemas.length > 0) return { ok: false, problemas }

  // Los locales con ubicación, contra el contorno de antes y el de después con la misma regla que
  // `data:validate` (que hoy deja 13 fuera como aviso): solo cuenta como "queda fuera" el que estaba dentro.
  const suyos = dataset.places.filter((place) => place.plazaId === plaza.id && place.location)
  const estabaDentro = (place: (typeof suyos)[number]) =>
    place.location ? isInsidePlazaGeometry(place.location, plaza.geometry) : true
  const estaDentro = (place: (typeof suyos)[number]) =>
    place.location ? isInsidePlazaGeometry(place.location, geometry) : true
  const quedanFuera = suyos.filter((place) => estabaDentro(place) && !estaDentro(place))
  const vuelvenDentro = suyos.filter((place) => !estabaDentro(place) && estaDentro(place))
  const siguenFuera = suyos.filter((place) => !estabaDentro(place) && !estaDentro(place)).length

  const areaAntes = Math.round(areaM2(anillaAntes))
  const areaDespues = Math.round(areaM2(nuevoAnillo))
  const avisos: string[] = []
  if (quedanFuera.length > 0) {
    avisos.push(
      `${quedanFuera.length} ${quedanFuera.length === 1 ? 'local queda' : 'locales quedan'} fuera del contorno nuevo. No bloquea (hoy ya hay locales fuera como aviso), pero conviene revisar su ubicación.`,
    )
  }
  if (Math.abs(areaDespues - areaAntes) > areaAntes * 0.5) {
    avisos.push('El área cambia más de la mitad: revisa que sea lo que querías.')
  }
  avisos.push(
    plaza.active
      ? 'Los edificios y las mallas de la plaza se recalculan al construir: al fusionar la PR el despliegue dibuja el contorno nuevo.'
      : 'La plaza está inactiva: no tiene página ni marcador, pero sus edificios se dibujan en gris y sin interacción, y cambiarán con el contorno nuevo.',
    'Se revierte con git, no con un botón.',
  )

  const filas = (crudo.plazas.plazas as Record<string, unknown>[] | undefined) ?? []
  return {
    ok: true,
    impacto: {
      plaza: { id: plaza.id, nombre: plaza.name },
      vertices: { antes: anillaAntes.length - 1, despues: nuevoAnillo.length - 1 },
      area: { antes: areaAntes, despues: areaDespues, cambio: areaDespues - areaAntes },
      locales: {
        quedanFuera: quedanFuera.map((place) => ({ id: place.id, nombre: place.name })),
        vuelvenDentro: vuelvenDentro.map((place) => ({ id: place.id, nombre: place.name })),
        siguenFuera,
      },
      avisos,
    },
    plazas: {
      ...crudo.plazas,
      updatedAt: hoy,
      plazas: filas.map((fila) => (String(fila.id) === plaza.id ? { ...fila, geometry } : fila)),
    },
  }
}

export type ResultadoContorno =
  | {
      ok: true
      /** `true` si esta llamada guardó; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoContorno
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda el contorno a la PR del panel. */
export async function guardarContorno(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoContorno> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararContorno(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaContornoSchema.parse(cuerpo).confirmar) {
    return {
      ok: true,
      confirmado: false,
      seco: cargado.seco,
      pr: null,
      mensaje: 'Esto es lo que cambiaría. No se ha guardado nada.',
      impacto: preparado.impacto,
    }
  }
  if (cargado.seco) {
    return {
      ok: true,
      confirmado: true,
      seco: true,
      pr: null,
      mensaje: 'Contorno validado. En desarrollo no se commitea.',
      impacto: preparado.impacto,
    }
  }

  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/commercial/plazas.json',
        contenido: `${JSON.stringify(preparado.plazas, null, 2)}\n`,
      },
    ],
    `Panel: contorno de la plaza "${preparado.impacto.plaza.nombre}"`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Contorno enviado a la PR.',
    impacto: preparado.impacto,
  }
}
