/**
 * Ajustes a mano de los edificios del mapa: ocultar uno o fijar su altura.
 *
 * Los edificios salen de un crudo (Overture) que no trae un id estable: `map:build` los numera por orden,
 * así que un número no sirve de clave. **Cada ajuste se identifica por un punto dentro de la huella**, el
 * mismo que se pulsa en el mapa, y opcionalmente por el id de Overture como comprobación cruzada. Al
 * construir, "la huella que contiene el punto" tiene que ser exactamente una: ninguna o varias es un error,
 * nunca un salto silencioso (un ajuste que deja de aplicarse sin avisar es el peor fallo posible).
 *
 * Sin dependencias del paquete inicial de la app: solo lo usan `data:validate`, `map:build` y el Worker.
 */
import { z } from 'zod'

const seis = (n: number) => Math.round(n * 1e6) / 1e6

const Punto = z.strictObject({
  lat: z.number().min(-90).max(90).transform(seis),
  lng: z.number().min(-180).max(180).transform(seis),
})

const Base = {
  punto: Punto,
  /** El id de Overture de la huella, si se conoce: si no coincide con el de la huella hallada, es un error. */
  overtureId: z.string().trim().min(1).max(80).optional(),
  /** Por qué se ajusta. Obligatorio: un cambio al mapa sin razón no se puede revisar después. */
  motivo: z.string().trim().min(3, 'Escribe por qué se ajusta').max(200),
  creado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD'),
}

export const AjusteEdificioSchema = z.discriminatedUnion('accion', [
  z.strictObject({ ...Base, accion: z.literal('ocultar') }),
  z.strictObject({
    ...Base,
    accion: z.literal('altura'),
    /** Metros, tal cual: no se redondea a pisos ni se mezcla con otras fuentes. */
    alturaM: z.number().min(1).max(120),
  }),
])

export const AjustesEdificiosFileSchema = z.strictObject({
  ajustes: z.array(AjusteEdificioSchema).max(500),
})

export type AjusteEdificio = z.infer<typeof AjusteEdificioSchema>
export type AjustesEdificiosFile = z.infer<typeof AjustesEdificiosFileSchema>
