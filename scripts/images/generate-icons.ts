/**
 * npm run images:icons
 *
 * Genera los PNG de icono a partir de public/logo.svg, que es la única fuente del símbolo.
 *
 * Son tres formatos porque cada sitio recorta distinto:
 *  - "any" (manifiesto): esquina redondeada propia, porque el lanzador lo pone tal cual.
 *  - "maskable" (manifiesto): fondo a sangre y el símbolo dentro de la zona segura del 80 %, porque
 *    el lanzador recorta la forma que quiera. Con un único icono "any maskable" se comían las
 *    esquinas y el símbolo quedaba pegado al borde.
 *  - apple-touch: a sangre y sin esquina, porque iOS aplica su propia máscara y redondear dos veces
 *    deja un borde sucio.
 *
 * Sobre el olivo el símbolo va en papel y en lima clara: el lima de la marca (#8cba37) queda
 * demasiado cerca del olivo del fondo y la aguja pierde sus dos mitades.
 */
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { ROOT } from '../data/lib/dataset.ts'

const OLIVO = '#536c2a'
const LIENZO = 256

const fuente = readFileSync(`${ROOT}public/logo.svg`, 'utf8')
const dentro = fuente.match(/<\/title>([\s\S]*)<\/svg>/)?.[1]
if (!dentro) throw new Error('public/logo.svg no tiene el formato esperado')
// Sobre fondo oscuro se invierte la marca: el olivo pasa a papel y el lima a su tono claro.
const simbolo = dentro.replaceAll('#536C2A', '#f7f4ed').replaceAll('#8CBA37', '#b8d77c')
if (simbolo === dentro) throw new Error('public/logo.svg no usa los colores esperados')

/** `escala` < 1 mete el símbolo en la zona segura; `radio` 0 deja el fondo a sangre. */
const lienzo = (escala: number, radio: number) => {
  const margen = (LIENZO * (1 - escala)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LIENZO} ${LIENZO}">
  <rect width="${LIENZO}" height="${LIENZO}" rx="${radio}" fill="${OLIVO}"/>
  <g transform="translate(${margen} ${margen}) scale(${escala})">${simbolo}</g>
</svg>`
}

const SALIDAS = [
  { file: 'public/icons/icon-192.png', size: 192, svg: lienzo(0.84, 48) },
  { file: 'public/icons/icon-512.png', size: 512, svg: lienzo(0.84, 48) },
  { file: 'public/icons/icon-maskable-192.png', size: 192, svg: lienzo(0.72, 0) },
  { file: 'public/icons/icon-maskable-512.png', size: 512, svg: lienzo(0.72, 0) },
  { file: 'public/apple-touch-icon.png', size: 180, svg: lienzo(0.8, 0) },
]

for (const { file, size, svg } of SALIDAS) {
  await sharp(Buffer.from(svg), { density: (72 * size) / LIENZO })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(`${ROOT}${file}`)
  console.log(`✓ ${file}`)
}
