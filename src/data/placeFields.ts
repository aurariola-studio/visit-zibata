/**
 * A qué pieza del paquete de datos pertenece cada campo de un local.
 *
 * El navegador no baja un local entero de golpe: baja un **resumen** al arrancar (lo que pintan las
 * tarjetas, el mapa, los filtros y el orden) y el **detalle** cuando hace falta (lo que solo se ve dentro
 * de la ficha, más la descripción que usa el buscador). El criterio es el uso, no el tamaño:
 *
 * - resumen: lo que decide o pinta algo antes de abrir una ficha. `hours` y `cierre` entran porque la
 *   insignia abierto/cerrado, el filtro "abierto ahora" y el orden los leen en cada tarjeta; `photos`
 *   entra completo porque solo se usa `photos[0]` y no pesa; `verification.status` lo lee la validación
 *   al cargar.
 * - detalle: lo que solo lee la ficha o el buscador.
 *
 * Una prueba (`placeFields.test.ts`) exige que cada clave del esquema esté aquí, en una pieza y solo en
 * una: un campo nuevo sin asignar rompe el test, no se cuela a una pieza por descuido.
 *
 * Solo constantes y sin imports, para que lo lean a la vez los tipos, el build y las pruebas.
 */
export const PLACE_SUMMARY_KEYS = [
  'id',
  'slug',
  'name',
  'plazaId',
  'giros',
  'hours',
  'location',
  'photos',
  'active',
  'cierre',
] as const

/** Del detalle, además de `id` (para unirlo con su resumen). */
export const PLACE_DETAIL_KEYS = [
  'description',
  'links',
  'phone',
  'googleMapsUri',
  'googlePlaceId',
] as const

/** `verification` se reparte por dentro: el estado viaja con el resumen y el resto con el detalle. */
export const VERIFICATION_SUMMARY_KEYS = ['status'] as const
export const VERIFICATION_DETAIL_KEYS = ['confidence', 'lastVerifiedAt'] as const
/** Las fuentes solo las usan el panel y el validador, que las traen del servidor: no viajan. */
export const VERIFICATION_NOT_SHIPPED_KEYS = ['sources'] as const
