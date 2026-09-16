/**
 * npm run images:icons
 *
 * Genera los iconos «maskable» del manifiesto (fondo a sangre y el símbolo dentro de la zona segura del
 * 80 %), separados de los iconos «any» con esquinas redondeadas. Con un único icono «any maskable» los
 * lanzadores recortaban las esquinas y el símbolo quedaba demasiado cerca del borde.
 */
import sharp from 'sharp'
import { ROOT } from '../data/lib/dataset.ts'

// Mismo símbolo que public/favicon.svg, en una caja de 32 × 32 escalada al 72 % y centrada (zona segura).
const symbol = `
  <path d="M16 6.5 26 12v8.4L16 26 6 20.4V12z" fill="#8cba37"/>
  <path d="M16 6.5 26 12l-10 5.6L6 12z" fill="#b8d77c"/>
  <path d="M16 17.6V26l10-5.6V12z" fill="#6a8736"/>
  <path d="M11.2 14.3 16 17l4.8-2.7" fill="none" stroke="#f3f8ea" stroke-width="1.2" stroke-linecap="round"/>`
const scale = 0.72
const offset = 16 - 16 * scale
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#536c2a"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${symbol}</g>
</svg>`

for (const size of [192, 512]) {
  const file = `${ROOT}public/icons/icon-maskable-${size}.png`
  await sharp(Buffer.from(svg), { density: (72 * size) / 32 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file)
  console.log(`✓ ${file}`)
}
