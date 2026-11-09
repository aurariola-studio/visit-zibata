/**
 * Ajustar un edificio del mapa desde el panel: ocultarlo, fijarle la altura, o quitar un ajuste.
 *
 * Como el resto de escrituras del panel, va en dos pasos: sin `confirmar` solo se calcula lo que cambiaría; con
 * `confirmar` se manda a la PR del panel. Lo único que toca el commit es `data/geographic/ajustes-edificios.json`.
 *
 * **Lo que el Worker NO puede comprobar** es que el punto caiga dentro de una sola huella: el crudo de edificios
 * no está aquí. Lo comprueba `map:build` (y por tanto el CI de la PR), que falla si un ajuste no resuelve a
 * exactamente una huella. Por eso el panel manda siempre un punto sacado de la forma del edificio que se eligió,
 * y por eso el aviso del paso previo lo dice con todas las letras: esa PR no se puede fusionar si el build falla.
 */
import { z } from 'zod'
import {
  type AjusteEdificio,
  AjusteEdificioSchema,
  AjustesEdificiosFileSchema,
  leerAjustes,
} from '../src/data/ajustes-edificios.ts'
import { isWithinBounds } from '../src/data/relations.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

const seis = (n: number) => Math.round(n * 1e6) / 1e6

export const EntradaEdificioSchema = z.strictObject({
  operacion: z.enum(['ajustar', 'quitar']),
  punto: z.strictObject({ lat: z.number().finite(), lng: z.number().finite() }),
  accion: z.enum(['ocultar', 'altura']).optional(),
  alturaM: z.number().finite().optional(),
  motivo: z.string().optional(),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ResumenEdificio {
  operacion: 'ajustar' | 'quitar'
  ajuste: AjusteEdificio
  /** Cuántos ajustes habrá en el archivo después. */
  total: number
  avisos: string[]
}

export type PreparadoEdificio =
  | { ok: true; resumen: ResumenEdificio; archivo: { ajustes: AjusteEdificio[] } }
  | { ok: false; problemas: string[] }

const mismoPunto = (a: AjusteEdificio, p: { lat: number; lng: number }) =>
  a.punto.lat === seis(p.lat) && a.punto.lng === seis(p.lng)

const AVISO_DE_BUILD =
  'Al construir, el build comprueba con el crudo de edificios que el punto cae en UNA sola huella. Si no, falla, y esa PR no se puede fusionar (la PR del panel agrupa todos sus cambios). Si falla, retíralo con "Retirar el último cambio" en el Resumen.'

/** La parte pura: valida y deja el archivo de ajustes listo. */
export function prepararEdificio(
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoEdificio {
  const entrada = EntradaEdificioSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  const dato = entrada.data
  const actual = leerAjustes(crudo.ajustesEdificios)
  if (!actual.valido) {
    return {
      ok: false,
      problemas: [
        'El archivo de ajustes de edificios no pasa el esquema: arréglalo en git antes de editarlo desde el panel.',
      ],
    }
  }

  if (dato.operacion === 'quitar') {
    const quitar = actual.ajustes.find((ajuste) => mismoPunto(ajuste, dato.punto))
    if (!quitar) return { ok: false, problemas: ['Ese ajuste ya no existe'] }
    return {
      ok: true,
      resumen: {
        operacion: 'quitar',
        ajuste: quitar,
        total: actual.ajustes.length - 1,
        avisos: [
          quitar.accion === 'ocultar'
            ? 'El edificio vuelve a aparecer en el mapa.'
            : 'El edificio vuelve a la altura estimada de los datos.',
          'Se revierte con git, no con un botón.',
        ],
      },
      archivo: { ajustes: actual.ajustes.filter((ajuste) => ajuste !== quitar) },
    }
  }

  if (!dato.accion) return { ok: false, problemas: ['accion: Elige ocultar o fijar la altura'] }
  if (dato.accion === 'ocultar' && dato.alturaM !== undefined) {
    return { ok: false, problemas: ['alturaM: Ocultar un edificio no lleva altura'] }
  }
  if (!isWithinBounds(dato.punto, LIMITES)) {
    return { ok: false, problemas: ['El punto cae fuera del área del mapa'] }
  }
  if (actual.ajustes.some((ajuste) => mismoPunto(ajuste, dato.punto))) {
    return {
      ok: false,
      problemas: ['Ya hay un ajuste en ese punto. Quítalo primero si quieres cambiarlo.'],
    }
  }
  const candidato = AjusteEdificioSchema.safeParse({
    accion: dato.accion,
    punto: dato.punto,
    ...(dato.accion === 'altura' ? { alturaM: dato.alturaM } : {}),
    motivo: dato.motivo ?? '',
    creado: hoy,
  })
  if (!candidato.success) {
    return {
      ok: false,
      problemas: candidato.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  const ajuste = candidato.data
  const ajustes = [...actual.ajustes, ajuste]
  const archivo = AjustesEdificiosFileSchema.safeParse({ ajustes })
  if (!archivo.success) {
    return {
      ok: false,
      problemas: archivo.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  return {
    ok: true,
    resumen: {
      operacion: 'ajustar',
      ajuste,
      total: ajustes.length,
      avisos: [
        ajuste.accion === 'ocultar'
          ? 'El edificio desaparece del mapa, en 2D y en 3D. Si todas las huellas reales de una plaza quedan ocultas, el mapa dibuja un volumen generado en su lugar.'
          : `La altura queda en ${ajuste.alturaM} m tal cual, en el mapa y en la vista 3D (sin mezclarla con otras fuentes ni redondearla a pisos de 3 m).`,
        AVISO_DE_BUILD,
        'Se revierte con git, o quitando el ajuste de la lista.',
      ],
    },
    archivo: archivo.data,
  }
}

export type ResultadoEdificio =
  | {
      ok: true
      /** `true` si esta llamada guardó; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      resumen: ResumenEdificio
    }
  | { ok: false; problemas: string[] }

/** Calcula lo que cambiaría y, con `confirmar`, lo manda a la PR del panel. */
export async function ajustarEdificio(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoEdificio> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararEdificio(cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaEdificioSchema.parse(cuerpo).confirmar) {
    return {
      ok: true,
      confirmado: false,
      seco: cargado.seco,
      pr: null,
      mensaje: 'Esto es lo que cambiaría. No se ha guardado nada.',
      resumen: preparado.resumen,
    }
  }
  if (cargado.seco) {
    return {
      ok: true,
      confirmado: true,
      seco: true,
      pr: null,
      mensaje: 'Ajuste validado. En desarrollo no se commitea.',
      resumen: preparado.resumen,
    }
  }

  const { ajuste, operacion } = preparado.resumen
  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/geographic/ajustes-edificios.json',
        contenido: `${JSON.stringify(preparado.archivo, null, 2)}\n`,
      },
    ],
    operacion === 'quitar'
      ? `Panel: quitar un ajuste de edificio (${ajuste.accion})`
      : `Panel: ${ajuste.accion === 'ocultar' ? 'ocultar un edificio' : `fijar un edificio a ${ajuste.alturaM} m`}`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: operacion === 'quitar' ? 'Ajuste quitado en la PR.' : 'Ajuste enviado a la PR.',
    resumen: preparado.resumen,
  }
}
