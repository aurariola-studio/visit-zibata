/**
 * El volumen provisional de una plaza desde el panel: la altura y el tamaño del prisma que el mapa dibuja
 * cuando la plaza no tiene huellas reales de edificio, y si ese prisma sustituye a las huellas que sí tenga.
 *
 * Como el resto de escrituras del panel, va en dos pasos: sin `confirmar` solo se calcula lo que cambiaría; con
 * `confirmar` se manda a la PR del panel. Lo único que toca el commit es `data/geographic/volumenes-plaza.json`.
 *
 * **Lo que el Worker NO sabe** es si la plaza tiene huellas reales: el crudo de edificios no está aquí. Por eso
 * los avisos lo dicen en condicional y el panel enseña, aparte, lo que trae el mapa publicado.
 *
 * **Lo que sí impide**: encender `replaceExisting` en una plaza que tiene un ajuste de edificio dentro de su
 * contorno. Con ese interruptor las huellas reales se descartan, así que el ajuste no cambiaría nada, y el build
 * lo da por error (`Ajustador`): la PR del panel no se podría fusionar.
 */
import { z } from 'zod'
import { leerAjustes } from '../src/data/ajustes-edificios.ts'
import { type CommercialDataset, isInsidePlazaGeometry } from '../src/data/relations.ts'
import {
  leerVolumenes,
  type ReglaDeVolumen,
  ReglaDeVolumenSchema,
  reglaDeVolumen,
} from '../src/data/volumenes-plaza.ts'
import { type Cargado, cargar } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

const base = {
  id: z.string().trim().min(1, 'Falta la plaza'),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
}

/** O las tres cifras de la regla, o `restablecer` (la plaza vuelve a la regla general). */
export const EntradaVolumenSchema = z.union([
  z.strictObject({ ...base, restablecer: z.literal(true) }),
  z.strictObject({ ...base, ...ReglaDeVolumenSchema.shape }),
])

export interface ImpactoVolumen {
  plaza: { id: string; nombre: string }
  antes: ReglaDeVolumen
  despues: ReglaDeVolumen
  /** La regla general, para que el panel diga "como el resto". */
  general: ReglaDeVolumen
  avisos: string[]
}

export type PreparadoVolumen =
  | { ok: true; impacto: ImpactoVolumen; archivo: Record<string, unknown> }
  | { ok: false; problemas: string[] }

const iguales = (a: ReglaDeVolumen, b: ReglaDeVolumen) =>
  a.height === b.height && a.scale === b.scale && a.replaceExisting === b.replaceExisting

/** La parte pura: valida, calcula el impacto y deja el archivo listo. */
export function prepararVolumen(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
): PreparadoVolumen {
  const entrada = EntradaVolumenSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  const dato = entrada.data

  const plaza = dataset.plazas.find((fila) => fila.id === dato.id)
  if (!plaza) return { ok: false, problemas: ['Esa plaza ya no existe'] }

  if (crudo.volumenesPlaza === undefined) {
    return {
      ok: false,
      problemas: [
        'Esta rama es anterior al volumen provisional: actualiza la PR del panel con la rama principal y vuelve a intentarlo.',
      ],
    }
  }
  const leido = leerVolumenes(crudo.volumenesPlaza)
  if (!leido.valido) {
    return {
      ok: false,
      problemas: [
        'El archivo de volúmenes no pasa el esquema: arréglalo en git antes de editarlo desde el panel.',
      ],
    }
  }
  const { archivo } = leido
  const antes = reglaDeVolumen(archivo, plaza.id)
  const despues: ReglaDeVolumen =
    'restablecer' in dato
      ? archivo.default
      : { height: dato.height, scale: dato.scale, replaceExisting: dato.replaceExisting }

  if (iguales(antes, despues)) {
    return { ok: false, problemas: ['Esa ya es la regla de la plaza: no hay nada que guardar.'] }
  }

  if (despues.replaceExisting && !antes.replaceExisting) {
    const ajustes = leerAjustes(crudo.ajustesEdificios)
    const dentro = ajustes.ajustes.filter((ajuste) =>
      isInsidePlazaGeometry(ajuste.punto, plaza.geometry),
    )
    if (dentro.length > 0) {
      return {
        ok: false,
        problemas: [
          `Hay ${dentro.length} ${dentro.length === 1 ? 'ajuste' : 'ajustes'} de edificio dentro del contorno de esta plaza. Con "Reemplazar las huellas reales" esas huellas se descartan y el ajuste no cambiaría nada, así que el build fallaría. Quita ${dentro.length === 1 ? 'ese ajuste' : 'esos ajustes'} primero (pestaña Edificios).`,
        ],
      }
    }
  }

  // Lo que se aparta de la regla general se guarda completo; lo que no, se quita (la plaza hereda).
  const plazas = { ...archivo.plazas }
  if (iguales(despues, archivo.default)) delete plazas[plaza.id]
  else plazas[plaza.id] = despues

  const avisos: string[] = []
  if (despues.replaceExisting) {
    avisos.push(
      'Las huellas reales de esta plaza (si las tiene) se descartan y el mapa dibuja solo el prisma, en 2D y en 3D.',
    )
  } else {
    avisos.push(
      'Con "Reemplazar las huellas reales" apagado, la altura y el tamaño solo se ven si la plaza no tiene huellas reales de edificio: si las tiene, el mapa dibuja esas.',
    )
  }
  if (despues.replaceExisting && antes.replaceExisting === false) {
    avisos.push(
      'Si después añades un ajuste de edificio dentro de esta plaza, el build fallará: sus huellas reales ya no se usan.',
    )
  }
  avisos.push(
    'El prisma es el contorno de la plaza a escala: es rectangular solo si el contorno lo es.',
    'Se recalcula al construir: al fusionar la PR el despliegue dibuja el prisma nuevo. Se revierte con git, o con "Restablecer".',
  )

  return {
    ok: true,
    impacto: {
      plaza: { id: plaza.id, nombre: plaza.name },
      antes,
      despues,
      general: archivo.default,
      avisos,
    },
    archivo: { ...archivo, plazas },
  }
}

export type ResultadoVolumen =
  | {
      ok: true
      /** `true` si esta llamada guardó; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoVolumen
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda la regla a la PR del panel. */
export async function guardarVolumen(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoVolumen> {
  const cargado = await cargar(entorno)
  const preparado = prepararVolumen(cargado.dataset, cargado.crudo, cuerpo)
  if (!preparado.ok) return preparado

  if (!EntradaVolumenSchema.parse(cuerpo).confirmar) {
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
      mensaje: 'Volumen validado. En desarrollo no se commitea.',
      impacto: preparado.impacto,
    }
  }

  const { plaza, despues } = preparado.impacto
  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/geographic/volumenes-plaza.json',
        contenido: `${JSON.stringify(preparado.archivo, null, 2)}\n`,
      },
    ],
    `Panel: volumen de la plaza "${plaza.nombre}" (${despues.height} m, ${Math.round(despues.scale * 100)} %)`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Volumen enviado a la PR.',
    impacto: preparado.impacto,
  }
}

/**
 * Las plazas cuyo volumen **reemplaza** sus huellas reales (`replaceExisting`): ahí un ajuste de edificio no
 * cambiaría nada y el build lo da por error. Vacío si el archivo de volúmenes falta o no pasa el esquema.
 */
export function plazasQueReemplazan(
  crudo: Cargado['crudo'],
  dataset: CommercialDataset,
): CommercialDataset['plazas'] {
  const leido = leerVolumenes(crudo.volumenesPlaza)
  if (!leido.valido) return []
  const { archivo } = leido
  return dataset.plazas.filter((plaza) => reglaDeVolumen(archivo, plaza.id).replaceExisting)
}
