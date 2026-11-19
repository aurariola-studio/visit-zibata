import { describe, expect, it, vi } from 'vitest'
import { en } from './en.ts'
import { es } from './es.ts'
import { aboutEn } from './grupos/about.en.ts'
import { aboutEs } from './grupos/about.es.ts'
import { onboardingEn } from './grupos/onboarding.en.ts'
import { onboardingEs } from './grupos/onboarding.es.ts'
import { seoBuildEn } from './grupos/seo-build.en.ts'
import { seoBuildEs } from './grupos/seo-build.es.ts'
import { cargarGrupo, setLocale, t } from './index.ts'

const GRUPOS = {
  about: [aboutEs, aboutEn],
  onboarding: [onboardingEs, onboardingEn],
  'seo-build': [seoBuildEs, seoBuildEn],
} as const

describe('los grupos de textos', () => {
  it('tienen las mismas claves en los dos idiomas', () => {
    for (const [, [delEs, delEn]] of Object.entries(GRUPOS)) {
      expect(Object.keys(delEn).sort()).toEqual(Object.keys(delEs).sort())
    }
  })

  it('no repiten una clave del catálogo base: una clave vive en un solo sitio', () => {
    for (const [nombre, [delEs]] of Object.entries(GRUPOS)) {
      const repetidas = Object.keys(delEs).filter((clave) => clave in es || clave in en)
      expect(repetidas, nombre).toEqual([])
    }
  })

  it('no se pisan entre sí', () => {
    const todas = Object.values(GRUPOS).flatMap(([delEs]) => Object.keys(delEs))
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('t() los lee solo cuando se pidió el grupo, y sigue al cambiar de idioma', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Sin pedirlo, la clave no resuelve (y en desarrollo avisa del olvido).
    expect(t('about.aboutBody')).toBe('about.aboutBody')
    expect(aviso).toHaveBeenCalledOnce()
    aviso.mockRestore()

    await cargarGrupo('about')
    expect(t('about.aboutBody')).toBe(aboutEs['about.aboutBody'])

    // Un diálogo abierto no se queda sin texto ni mezcla idiomas: el grupo cambia con el idioma.
    await setLocale('en')
    expect(t('about.aboutBody')).toBe(aboutEn['about.aboutBody'])
    expect(t('about.title')).toBe(en['about.title'])
  })
})
