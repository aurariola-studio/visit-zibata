/// <reference types="vite/client" />

/** Versión de package.json, inyectada por Vite (ver vite.config.ts). */
declare const __APP_VERSION__: string

/** URL pública absoluta (SITE_URL al compilar); cadena vacía si no se pasó. */
declare const __SITE_URL__: string

interface ImportMetaEnv {
  /** "true" para incluir el modo depuración del mapa en un build de producción. */
  readonly VITE_ENABLE_MAP_DEBUG?: string
  /** Clave pública de Web3Forms para "Sugiere un cambio" (ver src/config/site.ts). */
  readonly VITE_WEB3FORMS_KEY?: string
  /** Clave pública del widget de Turnstile (ver src/lib/turnstile.ts). Sin ella no hay desafío. */
  readonly VITE_TURNSTILE_SITEKEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
