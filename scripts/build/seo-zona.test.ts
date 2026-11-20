import { describe, expect, it } from 'vitest'
import { descripcionDeZona } from './seo-zona.ts'

describe('la descripción SEO de una zona', () => {
  it('respeta el texto de la zona y le añade siempre la misma cola larga cuando cabe', () => {
    expect(
      descripcionDeZona('Plaza comercial a un costado de Walmart Express Zibatá.', 5, 'es'),
    ).toBe(
      'Plaza comercial a un costado de Walmart Express Zibatá. Conoce los 5 lugares de la zona, con horarios, contacto y cómo llegar.',
    )
  })

  it('con un solo lugar usa la frase de las categorías, en singular y con "horario"', () => {
    expect(descripcionDeZona('Club de pádel en Zibatá, Querétaro.', 1, 'es')).toBe(
      'Club de pádel en Zibatá, Querétaro. Conoce el lugar que la comunidad tiene para ofrecerte, con horario, contacto y cómo llegar.',
    )
    expect(descripcionDeZona('Padel club in Zibatá, Querétaro.', 1, 'en')).toBe(
      'Padel club in Zibatá, Querétaro. Find the place the community has to offer, with opening hours, contact details and location.',
    )
  })

  it('si la larga no cabe en 160, pone la corta', () => {
    const paseo =
      'Plaza comercial frente a la Universidad Anáhuac con restaurantes, cafeterías, panadería y servicios.'
    const meta = descripcionDeZona(paseo, 30, 'es')
    expect(meta).toBe(`${paseo} 30 lugares, con horarios, contacto y cómo llegar.`)
    expect(meta.length).toBeLessThanOrEqual(160)
  })

  it('si ni la corta cabe, deja solo el texto de la zona', () => {
    const larga =
      'Canchas de pickleball y food trucks, frente a la Universidad Anáhuac y a un lado de la plaza comercial Paseo Zibatá, con estacionamiento.'
    expect(descripcionDeZona(larga, 1, 'es')).toBe(larga)
  })

  it('sin texto no inventa nada: la devuelve vacía para que se use la de reserva', () => {
    expect(descripcionDeZona('  ', 3, 'es')).toBe('')
  })

  it('ninguna salida con una descripción corta pasa de 160 caracteres', () => {
    for (const n of [1, 2, 12, 103]) {
      for (const idioma of ['es', 'en'] as const) {
        const meta = descripcionDeZona('Zona comercial de prueba con varios locales.', n, idioma)
        expect(meta.length).toBeLessThanOrEqual(160)
      }
    }
  })
})
