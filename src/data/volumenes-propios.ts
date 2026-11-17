/**
 * Volúmenes dibujados a mano para las zonas que no tienen edificios en los datos abiertos y que, además,
 * no son un solo bloque: unas canchas con su caseta, o un lote con foodtrucks. En vez del prisma único que
 * el mapa saca del contorno (`volumenes-plaza.json`), la zona lleva las piezas que se ven en el satélite.
 *
 * Vive en `data/geographic/volumenes-propios.json`, por zona. Una zona con piezas aquí no recibe el prisma
 * generado (salvo que su regla lleve `replaceExisting`). Sin dependencias del paquete inicial de la app:
 * solo lo usan `data:validate` y `map:build`.
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

export const VolumenesPropiosFileSchema = z.strictObject({
  $comment: z.string().optional(),
  plazas: z.record(z.string().regex(SLUG_PATTERN), z.array(PiezaSchema).min(1)),
})

export type Pieza = z.infer<typeof PiezaSchema>
export type VolumenesPropiosFile = z.infer<typeof VolumenesPropiosFileSchema>
