import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { setLocale } from '../i18n/index.ts'

// jsdom se anuncia en inglés: las pruebas comprueban la interfaz en español, que es el idioma base.
// (En Playwright el idioma se fija en playwright.config.ts con `locale: 'es-MX'`.)
setLocale('es')

afterEach(() => {
  cleanup()
})

// jsdom no implementa ResizeObserver, que la barra de categorías usa para saber si hay desbordamiento.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom tampoco implementa matchMedia; la interfaz lo consulta para adaptarse al ancho (escritorio,
// hoja móvil, avisos cortos). En pruebas se responde siempre "no coincide": el caso de escritorio.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
