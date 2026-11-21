import { describe, expect, it, vi } from 'vitest'
import lugaresJson from '../../data/commercial/places.json' with { type: 'json' }
import type { Place } from '../types/domain.ts'
import { PLACE_DETAIL_KEYS, PLACE_SUMMARY_KEYS } from './placeFields.ts'
import { projectDetail, projectSummary } from './placeParts.ts'
import { StaticPlacesRepository } from './StaticPlacesRepository.ts'

// Con los datos reales, recorridos uno por uno: no se nombra ningún negocio concreto.
const originales = (lugaresJson as unknown as { places: Place[] }).places

describe('StaticPlacesRepository: los locales viajan en dos paquetes', () => {
  it('el resumen y el detalle cubren los mismos locales que places.json, sin perder ninguno en la validación', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const repositorio = new StaticPlacesRepository()
    const [resumenes, detalles] = await Promise.all([
      repositorio.getPlaceSummaries(),
      repositorio.getPlaceDetails(),
    ])
    expect(resumenes.map((resumen) => resumen.id)).toEqual(originales.map((lugar) => lugar.id))
    expect(detalles.map((detalle) => detalle.id)).toEqual(originales.map((lugar) => lugar.id))
    expect(aviso).not.toHaveBeenCalled()
    aviso.mockRestore()
  })

  it('cada pieza trae solo sus campos', async () => {
    const repositorio = new StaticPlacesRepository()
    const permitidos = {
      resumen: new Set<string>(PLACE_SUMMARY_KEYS).add('verification'),
      detalle: new Set<string>(PLACE_DETAIL_KEYS).add('id').add('verification'),
    }
    for (const resumen of await repositorio.getPlaceSummaries()) {
      expect(Object.keys(resumen).filter((clave) => !permitidos.resumen.has(clave))).toEqual([])
    }
    for (const detalle of await repositorio.getPlaceDetails()) {
      expect(Object.keys(detalle).filter((clave) => !permitidos.detalle.has(clave))).toEqual([])
    }
  })

  it('ninguna de las dos piezas lleva las fuentes de la verificación', async () => {
    const repositorio = new StaticPlacesRepository()
    const texto = JSON.stringify([
      await repositorio.getPlaceSummaries(),
      await repositorio.getPlaceDetails(),
    ])
    expect(texto).not.toContain('"sources"')
  })

  it('cada paquete es la proyección de places.json y nada más: lo que genera el plugin es lo que define placeParts', async () => {
    const repositorio = new StaticPlacesRepository()
    expect(await repositorio.getPlaceSummaries()).toEqual(originales.map(projectSummary))
    expect(await repositorio.getPlaceDetails()).toEqual(originales.map(projectDetail))
  })
})
