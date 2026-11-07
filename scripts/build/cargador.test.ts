import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  CSS_CARGADOR,
  CSS_SIN_JS,
  HUELLA_CARGADOR,
  HUELLA_SIN_JS,
  htmlCargador,
} from './cargador.ts'

const huella = (css: string) =>
  `'sha256-${createHash('sha256').update(css, 'utf8').digest('base64')}'`

/**
 * El cargador es lo primero que ve quien entra: va en el HTML con su CSS para que no dependa de la
 * petición del CSS externo. Si el bloque y la huella de la CSP se separan, el navegador bloquea el
 * estilo y vuelve el HTML crudo.
 */
describe('cargador del HTML', () => {
  it('lleva el símbolo y la frase en el idioma de la página', () => {
    const espanol = htmlCargador('es')
    expect(espanol).toContain('class="cargador"')
    expect(espanol).toContain('<svg')
    expect(espanol).toContain('Preparando Zibatá')
    expect(espanol).toContain('Cargando Zibatá')

    const ingles = htmlCargador('en')
    expect(ingles).toContain('Preparing Zibatá')
    expect(ingles).toContain('Loading Zibatá')
  })

  it('las huellas son las del CSS que se inserta', () => {
    expect(HUELLA_CARGADOR).toBe(huella(CSS_CARGADOR))
    expect(HUELLA_SIN_JS).toBe(huella(CSS_SIN_JS))
  })

  it('el CSS no lleva un cierre de etiqueta que rompa el <style>', () => {
    expect(CSS_CARGADOR).not.toContain('<')
    expect(CSS_SIN_JS).not.toContain('<')
  })

  it('sin JavaScript se esconde el cargador y el artículo puede desplazarse', () => {
    expect(CSS_SIN_JS).toContain('.cargador{display:none}')
    expect(CSS_SIN_JS).toContain('body{overflow:auto}')
  })
})
