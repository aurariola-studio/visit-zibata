/**
 * node scripts/map/preparar.ts            deja listo el mapa (npm run map:prepare)
 * node scripts/map/preparar.ts --snapshot guarda las extracciones crudas actuales como snapshot
 *
 * El mapa se DERIVA al construir: las teselas (`zibata.pmtiles`), los edificios de las plazas
 * (`plaza-buildings.geojson`) y las mallas 3D (`edificios.bin`, `arboles.bin`) no están en git. Salen de
 * `map:build` (unos 11 s) y `map:build:mallas` (2 s), que son deterministas: con las mismas entradas dan
 * los mismos bytes.
 *
 * Las entradas son las extracciones crudas (OSM, huellas de Overture, copa arbórea, alturas de Open
 * Buildings, el recorte de Sentinel). Antes vivían solo en la máquina de quien las bajaba: la versión de
 * Overture que fija `config.json` caduca a los dos meses, así que regenerar el mapa dependía de un dato que
 * desaparece. Ahora hay un **snapshot** comprimido en `data/geographic/snapshot/` (unos 4 MB), versionado.
 * Este script lo restaura en `data/geographic/raw/` y regenera lo que haga falta.
 *
 * Por qué importa para el panel: editar el contorno de una plaza o un edificio es cambiar un JSON. Con el
 * mapa derivado, la PR del panel solo lleva ese JSON y el CI y el despliegue regeneran el resto. Un
 * workflow que empujara archivos con `GITHUB_TOKEN` no dispararía el CI.
 *
 * Una marca (hash de entradas, datos de plazas y código del mapa) evita rehacerlo si nada cambió.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { paths, ROOT } from './lib/paths.ts'

export interface Entrada {
  /** Nombre en `data/geographic/raw/`. */
  crudo: string
  /** Comprimido en el snapshot, o tal cual si ya lo está (un PNG). */
  gz: boolean
}

/** Lo que necesitan `map:build` y `map:build:mallas`. Los metadatos van sin comprimir: se leen y se diff. */
export const ENTRADAS: readonly Entrada[] = [
  { crudo: 'osm.json', gz: true },
  { crudo: 'osm.meta.json', gz: false },
  { crudo: 'overture-buildings.geojson', gz: true },
  { crudo: 'overture-buildings.meta.json', gz: false },
  { crudo: 'overture-tree-cover.geojson', gz: true },
  { crudo: 'overture-tree-cover.meta.json', gz: false },
  { crudo: 'open-buildings-alturas.bin', gz: true },
  { crudo: 'open-buildings-alturas.meta.json', gz: false },
  { crudo: 'sentinel-zibata.png', gz: false },
  { crudo: 'sentinel.meta.json', gz: false },
]

export const rutaDeSnapshot = (entrada: Entrada, carpeta: string): string =>
  join(carpeta, entrada.gz ? `${entrada.crudo}.gz` : entrada.crudo)

/** Restaura el snapshot en `crudo/`. Devuelve cuántos archivos escribió (los que ya eran iguales no). */
export function restaurar(snapshot: string, crudo: string, entradas = ENTRADAS): number {
  let escritos = 0
  mkdirSync(crudo, { recursive: true })
  for (const entrada of entradas) {
    const origen = rutaDeSnapshot(entrada, snapshot)
    if (!existsSync(origen)) throw new Error(`Falta ${origen}. Ejecuta \`npm run map:snapshot\`.`)
    const bytes = entrada.gz ? gunzipSync(readFileSync(origen)) : readFileSync(origen)
    const destino = join(crudo, entrada.crudo)
    if (existsSync(destino) && readFileSync(destino).equals(bytes)) continue
    writeFileSync(destino, bytes)
    escritos += 1
  }
  return escritos
}

/** Guarda lo que hay en `crudo/` como snapshot. El gzip no lleva fecha: los mismos bytes dan el mismo archivo. */
export function guardarSnapshot(crudo: string, snapshot: string, entradas = ENTRADAS): void {
  mkdirSync(snapshot, { recursive: true })
  for (const entrada of entradas) {
    const origen = join(crudo, entrada.crudo)
    if (!existsSync(origen)) throw new Error(`Falta ${origen}. Ejecuta \`npm run map:fetch\`.`)
    const bytes = readFileSync(origen)
    writeFileSync(
      rutaDeSnapshot(entrada, snapshot),
      entrada.gz ? gzipSync(bytes, { level: 9 }) : bytes,
    )
  }
}

/** Hash de un conjunto de archivos: su nombre y su contenido. Los que no existen cuentan como ausentes. */
export function huella(archivos: readonly string[]): string {
  const hash = createHash('sha256')
  for (const archivo of archivos) {
    hash.update(`${archivo}\0`)
    if (existsSync(archivo)) hash.update(readFileSync(archivo))
  }
  return hash.digest('hex')
}

/** Todos los `.ts` de una carpeta, sin pruebas, en orden estable. */
function codigoDe(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true })
    .flatMap((entrada) =>
      entrada.isDirectory()
        ? codigoDe(join(carpeta, entrada.name))
        : entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts')
          ? [join(carpeta, entrada.name)]
          : [],
    )
    .sort()
}

const MALLAS = join(ROOT, 'scripts/map/realismo/build-mallas.ts')
const MAPA = join(ROOT, 'scripts/map/build-map.ts')

/** Lo que el mapa produce y no está en git. */
export const SALIDAS = [
  paths.pmtiles,
  paths.plazaBuildings,
  join(paths.realismoDir, 'edificios.bin'),
  join(paths.realismoDir, 'arboles.bin'),
]

function ejecutar(script: string): void {
  execFileSync(process.execPath, [script], { cwd: ROOT, stdio: 'inherit' })
}

export function preparar(): void {
  const snapshot = join(ROOT, 'data/geographic/snapshot')
  const escritos = restaurar(snapshot, paths.rawDir)

  // Lo que, si cambia, cambia el mapa: las entradas, las plazas, la configuración y el código que lo hace.
  const entradas = [
    ...ENTRADAS.map((entrada) => rutaDeSnapshot(entrada, snapshot)),
    paths.plazas,
    paths.extent,
    paths.config,
    paths.ajustesEdificios,
    ...codigoDe(join(ROOT, 'scripts/map/lib')),
    ...codigoDe(join(ROOT, 'scripts/map/realismo')),
    MAPA,
  ]
  const marca = huella(entradas)
  const archivoDeMarca = join(ROOT, 'node_modules/.cache/zibata/mapa.json')
  const anterior = existsSync(archivoDeMarca)
    ? (JSON.parse(readFileSync(archivoDeMarca, 'utf8')) as { marca?: string }).marca
    : undefined

  if (anterior === marca && SALIDAS.every((salida) => existsSync(salida))) {
    console.log('✓ Mapa al día: nada que regenerar')
    return
  }
  const inicio = Date.now()
  console.log(`Regenerando el mapa (${escritos} entradas restauradas)…`)
  ejecutar(MAPA)
  ejecutar(MALLAS)
  mkdirSync(dirname(archivoDeMarca), { recursive: true })
  writeFileSync(archivoDeMarca, JSON.stringify({ marca }))
  console.log(`✓ Mapa regenerado en ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
}

// Solo como script: importarlo desde una prueba no debe construir nada.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop() ?? '')) {
  if (process.argv.includes('--snapshot')) {
    guardarSnapshot(paths.rawDir, join(ROOT, 'data/geographic/snapshot'))
    console.log('✓ Snapshot guardado en data/geographic/snapshot')
  } else {
    preparar()
  }
}

// Para que el tamaño del snapshot no crezca sin que nadie lo vea.
export const tamanoDeSnapshot = (carpeta: string): number =>
  existsSync(carpeta)
    ? readdirSync(carpeta).reduce((suma, nombre) => suma + statSync(join(carpeta, nombre)).size, 0)
    : 0
