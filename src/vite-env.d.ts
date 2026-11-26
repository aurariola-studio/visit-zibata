/// <reference types="vite/client" />

/** Versión de package.json, inyectada por Vite (ver vite.config.ts). */
declare const __APP_VERSION__: string

/** URL pública absoluta (SITE_URL al compilar); cadena vacía si no se pasó. */
declare const __SITE_URL__: string

/**
 * Los dos paquetes en que `vite.config.ts` parte `data/commercial/places.json` (ver `src/data/placeFields.ts`).
 * Los registros llegan sin validar: `runtimeValidation.ts` los comprueba uno a uno al cargarlos.
 */
declare module 'virtual:zibata-places-resumen' {
  const datos: { places: unknown[] }
  export default datos
}
/** `data/commercial/plazas.json` con la cercanía de cada punto de interés (ver `vite.config.ts`). */
declare module 'virtual:zibata-plazas' {
  const datos: { plazas: unknown[] }
  export default datos
}
declare module 'virtual:zibata-places-detalle' {
  const datos: { places: unknown[] }
  export default datos
}
