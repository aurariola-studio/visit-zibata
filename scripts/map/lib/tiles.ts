/**
 * Teselado vectorial en tiempo de preparación (nunca en el navegador):
 * GeoJSON → teselas MVT (geojson-vt + vt-pbf) comprimidas con gzip.
 */
import { gzipSync } from 'node:zlib'
import { GeoJSONVT, type GeoJSONVTTile } from '@maplibre/geojson-vt'
import { fromGeojsonVt } from '@maplibre/vt-pbf'
import type { Feature } from 'geojson'
import type { TileInput } from './pmtiles-writer.ts'

export const TILE_EXTENT = 4096

export interface LayerInput {
  name: string
  features: Feature[]
  minZoom: number
  maxZoom: number
}

export interface TileBuildOptions {
  minZoom: number
  maxZoom: number
  /** [oeste, sur, este, norte] */
  bounds: [number, number, number, number]
}

export interface TileBuildResult {
  tiles: TileInput[]
  /** Bytes (gzip) por zoom, para el informe del pipeline. */
  bytesByZoom: Record<number, number>
  largestTile: { z: number; x: number; y: number; bytes: number } | null
}

export function lngLatToTile(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return [Math.min(Math.max(x, 0), n - 1), Math.min(Math.max(y, 0), n - 1)]
}

export function buildVectorTiles(layers: LayerInput[], options: TileBuildOptions): TileBuildResult {
  const indexes = layers.map((layer) => ({
    layer,
    index: new GeoJSONVT(
      { type: 'FeatureCollection', features: layer.features },
      {
        maxZoom: options.maxZoom,
        indexMaxZoom: options.minZoom,
        tolerance: 3,
        extent: TILE_EXTENT,
        buffer: 64,
      },
    ),
  }))

  const [west, south, east, north] = options.bounds
  const tiles: TileInput[] = []
  const bytesByZoom: Record<number, number> = {}
  let largestTile: TileBuildResult['largestTile'] = null

  for (let z = options.minZoom; z <= options.maxZoom; z++) {
    const [xMin, yMin] = lngLatToTile(west, north, z)
    const [xMax, yMax] = lngLatToTile(east, south, z)
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const tileLayers: Record<string, GeoJSONVTTile> = {}
        for (const { layer, index } of indexes) {
          if (z < layer.minZoom || z > layer.maxZoom) continue
          const tile = index.getTile(z, x, y)
          if (tile && tile.features.length > 0) tileLayers[layer.name] = tile
        }
        if (Object.keys(tileLayers).length === 0) continue
        const data = gzipSync(fromGeojsonVt(tileLayers, { version: 2, extent: TILE_EXTENT }), {
          level: 9,
        })
        tiles.push({ z, x, y, data })
        bytesByZoom[z] = (bytesByZoom[z] ?? 0) + data.byteLength
        if (!largestTile || data.byteLength > largestTile.bytes) {
          largestTile = { z, x, y, bytes: data.byteLength }
        }
      }
    }
  }
  return { tiles, bytesByZoom, largestTile }
}
