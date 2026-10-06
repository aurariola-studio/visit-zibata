/**
 * Lo único que hay que saber decir en los dos idiomas a la vez.
 *
 * El botón de idioma escribe su etiqueta en el idioma **al que lleva** ("View the guide in English"
 * mientras estás en español), para no mezclar dos idiomas en una frase. Eso obligaba a tener el otro
 * catálogo entero cargado desde el primer instante, que es lo que hacía imposible partirlos: daba
 * igual cuánto se aplazara, la primera pantalla ya lo pedía.
 *
 * Aquí están esas cadenas y ninguna más. Son dos frases y dos nombres de idioma: unos 120 bytes que
 * sí viajan siempre, a cambio de que los cerca de 5 KB del catálogo que no se usa dejen de hacerlo.
 *
 * Los nombres van en su propio idioma a propósito ("Español", no "Spanish"), que es como se nombran
 * los idiomas en un selector y por eso coinciden en los dos catálogos.
 */
import type { Locale } from './index.ts'

export const NOMBRE_DEL_IDIOMA: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
}

export const LLEVA_AL_IDIOMA: Record<Locale, string> = {
  es: 'Ver la guía en {language}',
  en: 'View the guide in {language}',
}
