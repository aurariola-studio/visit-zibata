/**
 * El volumen que el mapa dibuja en una plaza cuando no hay huellas de edificio (o cuando las que hay no
 * representan el conjunto): un prisma sacado del contorno de la plaza, a escala y con una altura.
 *
 * Vive en `data/geographic/volumenes-plaza.json`: una regla general (`default`) y, por plaza, lo que se aparta
 * de ella. Antes estaba en `config.json`, que no se puede reescribir desde el panel (sus arreglos van en una
 * línea y `JSON.stringify` los desharía), y por eso se movió aquí.
 *
 * Sin dependencias del paquete inicial de la app: solo lo usan `data:validate`, `map:build` y el Worker.
 */
import { z } from 'zod'
import { ALTURA_MAX_M, ALTURA_MIN_M, ESCALA_MAX, ESCALA_MIN, SLUG_PATTERN } from './rules.ts'

const campos = {
  height: z.number().min(ALTURA_MIN_M).max(ALTURA_MAX_M),
  scale: z.number().min(ESCALA_MIN).max(ESCALA_MAX),
  replaceExisting: z.boolean(),
}

export const ReglaDeVolumenSchema = z.strictObject(campos)
export const AjusteDeVolumenSchema = z.strictObject(campos).partial()

export const VolumenesPlazaFileSchema = z.strictObject({
  $comment: z.string().optional(),
  default: ReglaDeVolumenSchema,
  plazas: z.record(z.string().regex(SLUG_PATTERN), AjusteDeVolumenSchema),
})

export type ReglaDeVolumen = z.infer<typeof ReglaDeVolumenSchema>
export type AjusteDeVolumen = z.infer<typeof AjusteDeVolumenSchema>
export type VolumenesPlazaFile = z.infer<typeof VolumenesPlazaFileSchema>

/** La regla de una plaza: la general con lo suyo encima. La usan el build y el panel, para no divergir. */
export const reglaDeVolumen = (
  archivo: Pick<VolumenesPlazaFile, 'default' | 'plazas'>,
  plazaId: string,
): ReglaDeVolumen => ({ ...archivo.default, ...archivo.plazas[plazaId] })

/** Lee el archivo tal como llega. Uno que no pasa el esquema no se edita: sobrescribirlo perdería lo que tiene. */
export function leerVolumenes(
  crudo: unknown,
): { valido: true; archivo: VolumenesPlazaFile } | { valido: false } {
  const resultado = VolumenesPlazaFileSchema.safeParse(crudo)
  return resultado.success ? { valido: true, archivo: resultado.data } : { valido: false }
}
