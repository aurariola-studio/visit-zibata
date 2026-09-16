/**
 * Escritor mínimo de archivos PMTiles v3 (https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md).
 *
 * Suficiente para un área pequeña como Zibatá: un único directorio raíz (sin directorios hoja),
 * compresión gzip interna y deduplicación de teselas idénticas. La librería oficial `pmtiles`
 * solo incluye lector; el test de este módulo verifica el resultado con ese lector.
 */
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { Compression, TileType, zxyToTileId } from 'pmtiles'

export { Compression, TileType }

export interface TileInput {
  z: number
  x: number
  y: number
  /** Contenido ya comprimido según `tileCompression`. */
  data: Uint8Array
}

export interface PmtilesOptions {
  tileType: TileType
  tileCompression: Compression
  minZoom: number
  maxZoom: number
  /** [oeste, sur, este, norte] */
  bounds: [number, number, number, number]
  /** [lng, lat, zoom] */
  center: [number, number, number]
  metadata: Record<string, unknown>
}

interface Entry {
  tileId: number
  offset: number
  length: number
  runLength: number
}

const HEADER_SIZE = 127
/** Límite práctico para no necesitar directorios hoja. */
const MAX_ROOT_ENTRIES = 16_000

function writeVarint(out: number[], value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`varint inválido: ${value}`)
  let v = value
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80)
    v = Math.floor(v / 0x80)
  }
  out.push(v)
}

export function serializeDirectory(entries: readonly Entry[]): Uint8Array {
  const out: number[] = []
  writeVarint(out, entries.length)
  let lastId = 0
  for (const entry of entries) {
    writeVarint(out, entry.tileId - lastId)
    lastId = entry.tileId
  }
  for (const entry of entries) writeVarint(out, entry.runLength)
  for (const entry of entries) writeVarint(out, entry.length)
  entries.forEach((entry, i) => {
    const previous = entries[i - 1]
    if (previous && entry.offset === previous.offset + previous.length) writeVarint(out, 0)
    else writeVarint(out, entry.offset + 1)
  })
  return Uint8Array.from(out)
}

function toE7(value: number): number {
  return Math.round(value * 1e7)
}

export function writePmtiles(tiles: readonly TileInput[], options: PmtilesOptions): Uint8Array {
  const sorted = tiles
    .map((tile) => ({ ...tile, tileId: zxyToTileId(tile.z, tile.x, tile.y) }))
    .sort((a, b) => a.tileId - b.tileId)

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]?.tileId === sorted[i - 1]?.tileId)
      throw new Error('Tesela duplicada en la entrada')
  }

  // Contenidos únicos en orden de TileID (archivo "clustered") con deduplicación por hash.
  const contents: Uint8Array[] = []
  const offsetByHash = new Map<string, { offset: number; length: number }>()
  const entries: Entry[] = []
  let dataLength = 0

  for (const tile of sorted) {
    const hash = createHash('sha1').update(tile.data).digest('hex')
    let stored = offsetByHash.get(hash)
    if (!stored) {
      stored = { offset: dataLength, length: tile.data.byteLength }
      offsetByHash.set(hash, stored)
      contents.push(tile.data)
      dataLength += tile.data.byteLength
    }
    const last = entries.at(-1)
    if (last && last.offset === stored.offset && last.tileId + last.runLength === tile.tileId) {
      last.runLength += 1
    } else {
      entries.push({
        tileId: tile.tileId,
        offset: stored.offset,
        length: stored.length,
        runLength: 1,
      })
    }
  }

  if (entries.length > MAX_ROOT_ENTRIES) {
    throw new Error(
      `Demasiadas entradas (${entries.length}); este escritor no genera directorios hoja`,
    )
  }

  const rootDirectory = gzipSync(serializeDirectory(entries))
  const metadata = gzipSync(Buffer.from(JSON.stringify(options.metadata), 'utf8'))

  const rootOffset = HEADER_SIZE
  const metadataOffset = rootOffset + rootDirectory.byteLength
  const leafOffset = metadataOffset + metadata.byteLength
  const tileDataOffset = leafOffset
  const total = tileDataOffset + dataLength

  const buffer = new Uint8Array(total)
  const view = new DataView(buffer.buffer)
  buffer.set(Buffer.from('PMTiles', 'ascii'), 0)
  view.setUint8(7, 3)
  view.setBigUint64(8, BigInt(rootOffset), true)
  view.setBigUint64(16, BigInt(rootDirectory.byteLength), true)
  view.setBigUint64(24, BigInt(metadataOffset), true)
  view.setBigUint64(32, BigInt(metadata.byteLength), true)
  view.setBigUint64(40, BigInt(leafOffset), true)
  view.setBigUint64(48, 0n, true)
  view.setBigUint64(56, BigInt(tileDataOffset), true)
  view.setBigUint64(64, BigInt(dataLength), true)
  view.setBigUint64(72, BigInt(sorted.length), true)
  view.setBigUint64(80, BigInt(entries.length), true)
  view.setBigUint64(88, BigInt(contents.length), true)
  view.setUint8(96, 1)
  view.setUint8(97, Compression.Gzip)
  view.setUint8(98, options.tileCompression)
  view.setUint8(99, options.tileType)
  view.setUint8(100, options.minZoom)
  view.setUint8(101, options.maxZoom)
  const [west, south, east, north] = options.bounds
  view.setInt32(102, toE7(west), true)
  view.setInt32(106, toE7(south), true)
  view.setInt32(110, toE7(east), true)
  view.setInt32(114, toE7(north), true)
  const [centerLng, centerLat, centerZoom] = options.center
  view.setUint8(118, centerZoom)
  view.setInt32(119, toE7(centerLng), true)
  view.setInt32(123, toE7(centerLat), true)

  buffer.set(rootDirectory, rootOffset)
  buffer.set(metadata, metadataOffset)
  let cursor = tileDataOffset
  for (const content of contents) {
    buffer.set(content, cursor)
    cursor += content.byteLength
  }
  return buffer
}
