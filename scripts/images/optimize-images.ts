/**
 * npm run images:optimize [-- --place tomassa] [--dry-run]
 *
 * Optimiza fotografías propias (nunca descargadas de Google ni de redes sociales) y las registra en
 * data/commercial/places.json.
 *
 * Entrada:  data/commercial/photos-src/<slug-del-lugar>/<nombre>.(jpg|jpeg|png|webp|avif|tif)
 *           (opcional) <nombre>.txt con el texto alternativo y, en una segunda línea, el crédito.
 * Salida:   public/images/places/<slug>/<nombre>.webp y .avif (máx. 1600 px)
 *           + variantes -480 (miniatura) y -960 en ambos formatos.
 * Las fotos ya registradas conservan su texto alternativo y crédito.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { syncPlazaDerivedFields, validateRelations } from '../../src/data/relations.ts'
import { slugify } from '../../src/lib/text.ts'
import type { Photo } from '../../src/types/domain.ts'
import {
  dataPaths,
  loadCategoriesFile,
  loadPlacesFile,
  loadPlazasFile,
  ROOT,
  today,
  writeDataFile,
} from '../data/lib/dataset.ts'

const { values } = parseArgs({
  options: {
    place: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    source: { type: 'string', default: `${ROOT}data/commercial/photos-src` },
    output: { type: 'string', default: `${ROOT}public/images/places` },
  },
})

const MAX_WIDTH = 1600
const VARIANTS = [480, 960]
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])

if (!existsSync(values.source)) {
  console.log(
    `No existe ${values.source}. Crea una carpeta por lugar (p. ej. photos-src/tomassa/) con sus fotos.`,
  )
  process.exit(0)
}

const placesFile = loadPlacesFile()
if (!placesFile) throw new Error('No existe data/commercial/places.json')
const placesById = new Map(placesFile.places.map((place) => [place.id, place]))

const folders = readdirSync(values.source, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && (!values.place || entry.name === values.place))
  .map((entry) => entry.name)

let processed = 0
for (const folder of folders) {
  const place = placesById.get(folder)
  if (!place) {
    console.warn(`⚠ La carpeta "${folder}" no corresponde a ningún lugar (usa el id del lugar)`)
    continue
  }
  const files = readdirSync(`${values.source}/${folder}`).filter((file) =>
    EXTENSIONS.has(extname(file).toLowerCase()),
  )
  const outDir = `${values.output}/${folder}`
  mkdirSync(outDir, { recursive: true })

  const photos: Photo[] = [...place.photos]
  for (const file of files.sort()) {
    const name = slugify(basename(file, extname(file)))
    const input = `${values.source}/${folder}/${file}`
    const image = sharp(input).rotate() // respeta la orientación EXIF
    const { width = 0, height = 0 } = await image.metadata()
    const targetWidth = Math.min(width, MAX_WIDTH)
    const targetHeight = Math.round((height * targetWidth) / Math.max(width, 1))

    if (!values['dry-run']) {
      const resized = image.clone().resize({ width: targetWidth, withoutEnlargement: true })
      await resized.clone().webp({ quality: 80 }).toFile(`${outDir}/${name}.webp`)
      await resized.clone().avif({ quality: 55 }).toFile(`${outDir}/${name}.avif`)
      for (const variant of VARIANTS.filter((w) => w < targetWidth)) {
        const small = image.clone().resize({ width: variant })
        await small.clone().webp({ quality: 78 }).toFile(`${outDir}/${name}-${variant}.webp`)
        await small.clone().avif({ quality: 52 }).toFile(`${outDir}/${name}-${variant}.avif`)
      }
    }

    const { dominant } = await image.clone().stats()
    const placeholder = `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
    const src = `images/places/${folder}/${name}.webp`
    const sidecar = `${values.source}/${folder}/${basename(file, extname(file))}.txt`
    const [altLine, creditLine] = existsSync(sidecar)
      ? readFileSync(sidecar, 'utf8').split(/\r?\n/)
      : []
    const existing = photos.findIndex((photo) => photo.src === src)
    const previous = existing >= 0 ? photos[existing] : undefined
    const credit = previous ? previous.credit : creditLine?.trim() || undefined
    const entry: Photo = {
      src,
      alt: previous?.alt ?? (altLine?.trim() || `Fotografía de ${place.name}`),
      width: targetWidth,
      height: targetHeight,
      variants: VARIANTS.filter((w) => w < targetWidth),
      placeholder,
      ...(credit ? { credit } : {}),
    }
    if (existing >= 0) photos[existing] = entry
    else photos.push(entry)
    if (!altLine && existing < 0)
      console.warn(`⚠ ${folder}/${file}: sin texto alternativo (.txt); se usó uno genérico`)
    processed++
    console.log(`✓ ${src} (${targetWidth}×${targetHeight})`)
  }
  placesById.set(folder, { ...place, photos })
}

const dataset = {
  categories: loadCategoriesFile().categories,
  plazas: loadPlazasFile().plazas,
  places: placesFile.places.map((place) => placesById.get(place.id) ?? place),
}
const errors = validateRelations({ ...dataset, plazas: syncPlazaDerivedFields(dataset) }).filter(
  (issue) => issue.level === 'error',
)
if (errors.length > 0) {
  for (const issue of errors) console.error(`✗ ${issue.dataset} [${issue.id}]: ${issue.message}`)
  process.exit(1)
}

if (values['dry-run']) {
  console.log(`(--dry-run) ${processed} foto(s) analizadas; no se escribió nada.`)
} else if (processed > 0) {
  writeDataFile(dataPaths.places, { ...placesFile, updatedAt: today(), places: dataset.places })
  console.log(`✓ ${processed} foto(s) optimizadas y registradas en places.json`)
} else {
  console.log('No se encontraron fotos para procesar.')
}
