/**
 * La procedencia de un local o una plaza, decidida en un solo sitio.
 *
 * **Nada se afirma sin declararlo.** Guardar una errata no toca `verification`: ni la fecha ni las fuentes.
 * La verificación solo cambia cuando quien edita aporta evidencia nueva:
 *
 *  - la casilla "Lo comprobé yo" (en el lugar): añade `campo:AAAA-MM-DD` y sube la fecha, o
 *  - una URL que no estaba.
 *
 * Quitar una fuente o cambiar la confianza no cuenta como evidencia y no mueve la fecha.
 *
 * El estado de investigación (`verification.status`) sigue la metodología (research/methodology.md):
 *
 *  - `active` lo da la casilla, porque es lo único que el panel puede dar por comprobado;
 *  - `likely_active` exige evidencia de la sucursal que no sea solo OpenStreetMap ni una app de reparto;
 *  - pasar de un estado que no se publica a uno que sí pide evidencia en ese mismo guardado.
 *
 * El servidor no distingue una fuente oficial de una secundaria, así que no lo finge: solo rechaza lo que la
 * metodología rechaza sin duda (una fuente que es solo OpenStreetMap o reparto) y deja el resto a quien declara.
 */
import { z } from 'zod'
import {
  FIELD_SOURCE_PATTERN,
  isHttpUrl,
  LOCATION_CONFIDENCE,
  PUBLISHABLE_STATUS,
  RESEARCH_STATUS,
} from '../src/data/rules.ts'
import type { Place } from '../src/types/domain.ts'

export type Verificacion = NonNullable<Place['verification']>

/** Más fuentes que esto no caben en la ficha de investigación. */
export const TOPE_DE_FUENTES = 8

/** Lo que manda el formulario. El bloque entra siempre y el servidor decide qué cambió. */
export const EntradaVerificacionSchema = z.strictObject({
  /** Declara que se comprobó en el lugar: añade `campo:AAAA-MM-DD`. */
  comprobadoPorMi: z.boolean().optional().default(false),
  /** URL públicas. Los `campo:` ya guardados se conservan solos; no se escriben a mano. */
  fuentes: z.array(z.string().trim().max(500)).max(TOPE_DE_FUENTES).optional().default([]),
  confianza: z.enum(LOCATION_CONFIDENCE),
  /** Solo plazas: el estado de investigación. Sin él se conserva el que había. */
  estado: z.enum(RESEARCH_STATUS).optional(),
})
export type EntradaVerificacion = z.infer<typeof EntradaVerificacionSchema>

/**
 * Dominios que la metodología no acepta como respaldo de que una sucursal existe: OpenStreetMap (lo edita
 * cualquiera) y las apps de reparto (la tienda de reparto no prueba el local).
 */
const DOMINIOS_DEBILES = [
  'openstreetmap.org',
  'rappi.com',
  'rappi.com.mx',
  'ubereats.com',
  'didiglobal.com',
  'didi-food.com',
]

export function esFuenteDebil(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return DOMINIOS_DEBILES.some((dominio) => host === dominio || host.endsWith(`.${dominio}`))
  } catch {
    return false
  }
}

const publicable = (estado: string | undefined): boolean =>
  estado !== undefined && (PUBLISHABLE_STATUS as readonly string[]).includes(estado)

export type ResultadoVerificacion =
  | { ok: true; verification: Verificacion | undefined; evidenciaNueva: boolean }
  | { ok: false; problemas: string[] }

interface Parametros {
  previa: Verificacion | undefined
  entrada: EntradaVerificacion
  hoy: string
  /** Si lo que se guarda se va a ver en la guía. */
  visible: boolean
  /**
   * Un local que se hace visible sin estado que lo publique se promueve a `likely_active`, con evidencia.
   * Una plaza no: su promoción al activarla es otra regla (worker/plazas.ts) y la decidió el propietario.
   */
  promover: boolean
}

/** Las URL del formulario, sin vacíos ni repetidas, y solo https o http. */
export function parsearFuentes(
  lista: readonly string[],
): { urls: string[] } | { problema: string } {
  const urls = [...new Set(lista.map((fuente) => fuente.trim()).filter(Boolean))]
  for (const fuente of urls) {
    if (FIELD_SOURCE_PATTERN.test(fuente)) {
      return {
        problema:
          'fuentes: "campo:" no se escribe a mano: afirma una verificación en el lugar. Usa la casilla "Lo comprobé yo".',
      }
    }
    if (!isHttpUrl(fuente)) {
      return {
        problema: `fuentes: "${fuente}" no es una URL. Escribe la dirección completa, con https://.`,
      }
    }
  }
  return { urls }
}

export function resolverVerificacion(parametros: Parametros): ResultadoVerificacion {
  const { previa, entrada, hoy, visible, promover } = parametros
  const analizadas = parsearFuentes(entrada.fuentes)
  if ('problema' in analizadas) return { ok: false, problemas: [analizadas.problema] }
  const urls = analizadas.urls

  const previas = previa?.sources ?? []
  const urlsPrevias = new Set(previas.filter((fuente) => !FIELD_SOURCE_PATTERN.test(fuente)))
  const marcasDeCampo = previas.filter((fuente) => FIELD_SOURCE_PATTERN.test(fuente))
  const urlsNuevas = urls.filter((fuente) => !urlsPrevias.has(fuente))
  const evidenciaNueva = entrada.comprobadoPorMi || urlsNuevas.length > 0
  // Se conserva el orden que ya tenían: una errata no puede reescribir la lista.
  const conservadas = previas.filter(
    (fuente) => marcasDeCampo.includes(fuente) || urls.includes(fuente),
  )
  const sources = [
    ...new Set([
      ...conservadas,
      ...urlsNuevas,
      ...(entrada.comprobadoPorMi ? [`campo:${hoy}`] : []),
    ]),
  ]
  if (sources.length > TOPE_DE_FUENTES) {
    return {
      ok: false,
      problemas: [
        `fuentes: Son ${sources.length} fuentes contando las verificaciones en el lugar, y el tope son ${TOPE_DE_FUENTES}. Quita alguna.`,
      ],
    }
  }

  const estadoPrevio = previa?.status
  // El selector del formulario trae el estado de siempre: solo cuenta si se cambió.
  const pedido = entrada.estado !== estadoPrevio ? entrada.estado : undefined
  let estado: string
  if (pedido) estado = pedido
  else if (entrada.comprobadoPorMi && visible) estado = 'active'
  else if (estadoPrevio && (publicable(estadoPrevio) || !promover || !visible))
    estado = estadoPrevio
  else estado = visible && promover ? 'likely_active' : (estadoPrevio ?? 'uncertain')

  // Pasar a un estado que se publica pide evidencia en este mismo guardado, y que la metodología la acepte.
  const sube = publicable(estado) && !publicable(estadoPrevio)
  if (sube) {
    const hayBuena = entrada.comprobadoPorMi || urlsNuevas.some((fuente) => !esFuenteDebil(fuente))
    if (!hayBuena) {
      return {
        ok: false,
        problemas: [
          urlsNuevas.length > 0
            ? 'fuentes: Solo hay fuentes de OpenStreetMap o de apps de reparto, y la metodología no las acepta como respaldo. Aporta una fuente oficial (sitio, redes o ficha del negocio) o marca "Lo comprobé yo" si fuiste a verlo.'
            : 'fuentes: Para que se publique hace falta evidencia nueva en este guardado: marca "Lo comprobé yo" si fuiste a verlo, o añade una fuente oficial (sitio, redes o ficha del negocio).',
        ],
      }
    }
  }

  const igual =
    previa !== undefined &&
    previa.status === estado &&
    previa.confidence === entrada.confianza &&
    previa.sources.length === sources.length &&
    previa.sources.every((fuente, posicion) => fuente === sources[posicion])
  // Sin nada que declarar y sin registro previo, el local queda como estaba: no se fabrica una verificación.
  if (previa === undefined && sources.length === 0) {
    return { ok: true, verification: undefined, evidenciaNueva }
  }
  if (previa !== undefined && igual && !evidenciaNueva) {
    return { ok: true, verification: previa, evidenciaNueva }
  }
  if (sources.length === 0) {
    return {
      ok: false,
      problemas: ['fuentes: Aporta al menos una fuente (una URL) o marca "Lo comprobé yo".'],
    }
  }
  return {
    ok: true,
    evidenciaNueva,
    verification: {
      status: estado as Verificacion['status'],
      confidence: entrada.confianza,
      lastVerifiedAt: evidenciaNueva ? hoy : (previa?.lastVerifiedAt ?? hoy),
      sources,
    },
  }
}
