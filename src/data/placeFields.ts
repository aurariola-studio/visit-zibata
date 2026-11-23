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
  'unit',
] as const

/**
 * `verification` se reparte por dentro. Al resumen van el estado (lo lee la validación al cargar) y la fecha
 * de revisión (sale en la tabla de horario, que también es del resumen: así la tabla no cambia al llegar el
 * detalle). El detalle no lleva nada de `verification`.
 */
export const VERIFICATION_SUMMARY_KEYS = ['status', 'lastVerifiedAt'] as const
/**
 * No viajan: las fuentes las usan el panel y el validador, que las traen del servidor, y la confianza de la
 * verificación no la lee nada en la guía.
 */
export const VERIFICATION_NOT_SHIPPED_KEYS = ['confidence', 'sources'] as const
