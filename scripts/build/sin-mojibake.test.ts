import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

/**
 * Una "Â©" donde va un "©". Un archivo guardado dos veces con la codificación equivocada deja sus tildes y
 * símbolos como pares de caracteres raros, y si el texto sale en pantalla se ve. Pasó en la atribución del
 * mapa (`© OpenStreetMap` salía como `Â© OpenStreetMap`) y nadie lo notó en cinco semanas: ninguna prueba
 * miraba el texto. Esta mira todo `src/`.
 */
const MOJIBAKE = /[\u00c2-\u00c3][\u0080-\u00bf]/

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(ts|tsx|css|json|html)$/.test(ruta) ? [ruta] : []
  })
}

it('ningún archivo de src tiene caracteres con la codificación doble', () => {
  const rotos = archivos('src').filter((ruta) => MOJIBAKE.test(readFileSync(ruta, 'utf8')))
  expect(rotos).toEqual([])
})
