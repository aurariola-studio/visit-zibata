// @vitest-environment node
import { gunzipSync } from 'node:zlib'
import { PMTiles, type RangeResponse, type Source } from 'pmtiles'
import { describe, expect, it } from 'vitest'
import { Compression, TileType, writePmtiles } from './pmtiles-writer.ts'

class BufferSource implements Source {
  private readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  getKey(): string {
    return 'memory'
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const slice = this.bytes.slice(offset, offset + length)
    return { data: slice.buffer }
  }
}

const bytes = (...values: number[]) => Uint8Array.from(values)

describe('writePmtiles', () => {
  const archive = writePmtiles(
    [
      { z: 1, x: 1, y: 0, data: bytes(9, 9) },
      { z: 0, x: 0, y: 0, data: bytes(1, 2, 3) },
      { z: 1, x: 0, y: 0, data: bytes(9, 9) },
      { z: 1, x: 0, y: 1, data: bytes(7) },
    ],
    {
      tileType: TileType.Mvt,
      tileCompression: Compression.None,
      minZoom: 0,
      maxZoom: 1,
      bounds: [-100.37, 20.65, -100.29, 20.705],
      center: [-100.33, 20.68, 0],
      metadata: { name: 'prueba', vector_layers: [] },
    },
  )

  const reader = new PMTiles(new BufferSource(archive))

  it('escribe una cabecera que el lector oficial entiende', async () => {
    const header = await reader.getHeader()
    expect(header.specVersion).toBe(3)
    expect(header.tileType).toBe(TileType.Mvt)
    expect(header.minZoom).toBe(0)
    expect(header.maxZoom).toBe(1)
    expect(header.numAddressedTiles).toBe(4)
    expect(header.numTileContents).toBe(3)
    expect(header.clustered).toBe(true)
    expect(header.minLon).toBeCloseTo(-100.37, 6)
    expect(header.maxLat).toBeCloseTo(20.705, 6)
  })

  it('recupera cada tesela, incluidas las deduplicadas', async () => {
    const read = async (z: number, x: number, y: number) => [
      ...new Uint8Array((await reader.getZxy(z, x, y))?.data ?? new ArrayBuffer(0)),
    ]
    expect(await read(0, 0, 0)).toEqual([1, 2, 3])
    expect(await read(1, 0, 0)).toEqual([9, 9])
    expect(await read(1, 1, 0)).toEqual([9, 9])
    expect(await read(1, 0, 1)).toEqual([7])
    expect(await reader.getZxy(1, 1, 1)).toBeUndefined()
  })

  it('guarda los metadatos JSON comprimidos', async () => {
    expect(await reader.getMetadata()).toEqual({ name: 'prueba', vector_layers: [] })
    const header = await reader.getHeader()
    const raw = archive.slice(
      header.jsonMetadataOffset,
      header.jsonMetadataOffset + header.jsonMetadataLength,
    )
    expect(JSON.parse(gunzipSync(raw).toString('utf8')).name).toBe('prueba')
  })

  it('rechaza teselas duplicadas', () => {
    const tile = { z: 0, x: 0, y: 0, data: bytes(1) }
    expect(() =>
      writePmtiles([tile, tile], {
        tileType: TileType.Mvt,
        tileCompression: Compression.None,
        minZoom: 0,
        maxZoom: 0,
        bounds: [0, 0, 1, 1],
        center: [0, 0, 0],
        metadata: {},
      }),
    ).toThrow(/duplicada/)
  })
})
