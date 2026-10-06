import { describe, expect, it } from 'vitest'
import { metaTag } from './prerender.ts'

/*
 * El `index.html` de origen está formateado, y las etiquetas largas llevan sus atributos en líneas
 * aparte. Un patrón escrito con un solo espacio no las encontraba: no reemplazaba nada, el
 * prerenderizado creía que la etiqueta no existía y añadía una segunda. Las 232 páginas de la
 * v4.6.0 salieron publicadas con dos descripciones, la general de la portada y la suya.
 */
describe('localizar una etiqueta del head', () => {
  const enUnaLinea = '<meta name="description" content="Una guía de Zibatá." />'
  const enVariasLineas = `<meta
      name="description"
      content="Una guía de Zibatá."
    />`

  it('encuentra la etiqueta esté en una línea o repartida en varias', () => {
    expect(enUnaLinea).toMatch(metaTag('name', 'description'))
    expect(enVariasLineas).toMatch(metaTag('name', 'description'))
  })

  it('reemplaza en vez de duplicar, que es lo que fallaba', () => {
    const nuevo = '<meta name="description" content="Plaza Condesa." />'
    for (const original of [enUnaLinea, enVariasLineas]) {
      const resultado = original.replace(metaTag('name', 'description'), nuevo)
      expect(resultado).toBe(nuevo)
      expect(resultado.match(/name="description"/g)).toHaveLength(1)
    }
  })

  it('no confunde una etiqueta con otra que empiece igual', () => {
    const imagen = '<meta property="og:image" content="x.jpg" />'
    const ancho = '<meta property="og:image:width" content="1200" />'
    expect(ancho).not.toMatch(metaTag('property', 'og:image'))
    expect(imagen).toMatch(metaTag('property', 'og:image'))
  })
})
