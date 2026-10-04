/**
 * Datos del propio sitio (no de los negocios). Aquí viven los ajustes que cambian con el proyecto y
 * no con el contenido: la versión que se muestra en "Acerca de" y el canal de "Sugiere un cambio".
 */
export const APP_VERSION = __APP_VERSION__

/**
 * URL pública de la guía, la misma que usa Open Graph. Vacía si no se pasó `SITE_URL` al compilar
 * (desarrollo, pruebas y despliegues de prueba), y entonces el enlace para compartir se arma con la
 * ubicación real del navegador.
 */
export const SITE_URL = __SITE_URL__

/**
 * Clave pública de Web3Forms, el servicio que entrega por correo lo que se envía desde "Sugiere un
 * cambio". Es una clave de cliente, no un secreto: identifica el formulario y el correo de destino
 * vive en Web3Forms, no en el código, así que la dirección nunca se publica.
 *
 * Sin clave, la guía no dibuja el formulario y explica que el canal todavía no está abierto. Para
 * abrirlo, pide la clave en https://web3forms.com con el correo de destino y pégala aquí (o pásala al
 * compilar con VITE_WEB3FORMS_KEY, que es lo que hace el flujo de publicación).
 */
export const SUGGEST_FORM_KEY = import.meta.env.VITE_WEB3FORMS_KEY?.trim() ?? ''

/** Adónde se envía el formulario. Solo este origen se abre en la CSP (ver vite.config.ts). */
export const SUGGEST_FORM_ENDPOINT = 'https://api.web3forms.com/submit'

/** ¿Hay canal abierto? Sin clave, "Sugiere un cambio" explica que todavía no lo hay. */
export const canSuggest = (): boolean => SUGGEST_FORM_KEY.length > 0
