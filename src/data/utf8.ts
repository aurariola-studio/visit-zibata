/**
 * Excel en Windows guarda "CSV" en ANSI (Windows-1252) salvo que se elija "CSV UTF-8". Leído como UTF-8,
 * cada acento se vuelve U+FFFD: las plazas con acento no se encuentran y, peor, un local de una plaza sin
 * acento se guardaría como "Caf� Luna" y la guía lo publicaría. Se rechaza el archivo entero.
 */
export const MENSAJE_NO_UTF8 =
  'El archivo no está en UTF-8: los acentos se leen mal. En Excel, guárdalo como "CSV UTF-8 (delimitado por comas)".'

// El carácter de reemplazo (U+FFFD) que deja un decodificador UTF-8 ante un byte que no es UTF-8.
const REEMPLAZO = String.fromCharCode(0xfffd)

export const noEsUtf8 = (texto: string): boolean => texto.includes(REEMPLAZO)
