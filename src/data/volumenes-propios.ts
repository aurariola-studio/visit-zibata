/**
 * Volúmenes dibujados a mano para lo que los datos abiertos no traen.
 *
 * Vive en `data/geographic/volumenes-propios.json` y tiene dos partes:
 *
 *  - `plazas`: las piezas de una zona que no tiene edificios abiertos y que, además, no es un solo bloque (unas
 *    canchas con su caseta, o un lote con foodtrucks). En vez del prisma único que el mapa saca del contorno
 *    (`volumenes-plaza.json`), la zona lleva las piezas que se ven en el satélite. Una zona con piezas aquí no
 *    recibe el prisma generado (salvo que su regla lleve `replaceExisting`).
 *  - `sueltos`: un edificio que **no es una zona**: está en el mapa y no tiene página, marcador ni locales. Entra
 *    entre los edificios base (teselas, mallas del realismo y árboles lo ven como cualquier otro) y se retira
 *    cuando los datos abiertos traen su huella: `map:build` falla si una huella abierta lo cubre.
 *
 * Sin dependencias del paquete inicial de la app: solo lo usan `data:validate` y `map:build`.
 */
import { z } from 'zod'
import { SLUG_PATTERN } from './rules.ts'

const posicion = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])

export const PiezaSchema = z.strictObject({
  /** Qué es: "Cancha 1", "Caseta", "Foodtruck". Solo para quien lea el archivo. */
  nombre: z.string().trim().min(1).max(60),
  /** Metros. Una cancha es casi plana; un foodtruck, de unos tres. */
  height: z.number().min(0.3).max(30),
  /** Anillo cerrado, [lng, lat]. */
  anillo: z.array(posicion).min(4, 'Un anillo necesita al menos 4 posiciones'),
})

/**
 * Un edificio que está en el mapa sin ser una zona. Nada de esto se inventa: la procedencia del contorno y la
 * de la altura son campos obligatorios y se escriben con palabras.
 */
export const SueltoSchema = z.strictObject({
  /** Identificador estable; sin acentos ni espacios. */
  id: z.string().regex(SLUG_PATTERN),
  /** Qué es, para quien lea el archivo. */
  nombre: z.string().trim().min(1).max(60),
  /** Metros. */
  height: z.number().min(0.3).max(60),
  /** Anillo cerrado, [lng, lat]: el contorno tal como se ve en el techo, sin reducir. */
  anillo: z.array(posicion).min(4, 'Un anillo necesita al menos 4 posiciones'),
  /** De dónde sale el contorno: la imagen, la fecha y, si la hubo, la visita en sitio. */
  fuente: z.string().trim().min(20).max(500),
  /** De dónde sale la altura. Si es una estimación, se dice: no se presenta como dato. */
  alturaNota: z.string().trim().min(10).max(300),
  /** Cuándo se dibujó (AAAA-MM-DD). */
  creado: z.iso.date(),
  /** Qué tiene que pasar para retirarlo. */
  retirarCuando: z.string().trim().min(10).max(300),
})

export const VolumenesPropiosFileSchema = z.strictObject({
  $comment: z.string().optional(),
  plazas: z.record(z.string().regex(SLUG_PATTERN), z.array(PiezaSchema).min(1)),
  sueltos: z.array(SueltoSchema).optional(),
})

export type Pieza = z.infer<typeof PiezaSchema>
export type Suelto = z.infer<typeof SueltoSchema>
export type VolumenesPropiosFile = z.infer<typeof VolumenesPropiosFileSchema>
