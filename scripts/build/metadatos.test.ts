import { describe, expect, it } from 'vitest'
import {
  aplanarDescripcion,
  type Contexto,
  contextoDe,
  descripcionDeFicha,
  LIMITE_DESCRIPCION,
  lugarDe,
  quitarNombre,
  recortar,
  repetidos,
} from './metadatos.ts'

/*
 * Los casos son locales reales del dataset, con el texto que traen hoy: cada defecto que esto corrige
 * se midió en ellos (auditoría SEO, documentos 07 y 08), y una prueba escrita con un texto inventado
 * podría pasar sin tocar nunca el caso que falló.
 */

const contexto = (giros: string[], lugar: string): Contexto => ({
  giros,
  lugar,
  idioma: 'es',
  conGiros: '{giros} en {lugar}.',
  soloLugar: 'En {lugar}.',
})

describe('aplanar los saltos de línea de una descripción', () => {
  it('une con " · " cuando el salto separa dos ideas y la primera no termina en puntuación', () => {
    // origenatural: "Urban Bistró" y "Comer rico y sentirte bien." eran dos líneas; aplanadas con un
    // espacio decían "Urban Bistró Comer rico...", como si fuera un solo nombre.
    expect(aplanarDescripcion('Urban Bistró\nComer rico y sentirte bien.')).toBe(
      'Urban Bistró · Comer rico y sentirte bien.',
    )
    expect(
      aplanarDescripcion(
        'El lugar donde la música, la comida y las risas se mezclan\nAlitas & Pisto',
      ),
    ).toBe('El lugar donde la música, la comida y las risas se mezclan · Alitas & Pisto')
  })

  it('une con un espacio un corte duro a media frase', () => {
    // burger-fries: el dato parte la oración en renglones; el salto no separa nada.
    expect(
      aplanarDescripcion(
        'Creemos que todos deben disfrutar de una buena hamburguesa\nsin pagar de más y queremos\nque cada persona',
      ),
    ).toBe(
      'Creemos que todos deben disfrutar de una buena hamburguesa sin pagar de más y queremos que cada persona',
    )
  })

  it('une con un espacio si la línea ya termina en puntuación o en un emoji', () => {
    expect(aplanarDescripcion('JUST POKE & FUN 🍚😎🍚😎\nEst. 2018')).toBe(
      'JUST POKE & FUN 🍚😎🍚😎 Est. 2018',
    )
    expect(aplanarDescripcion('Gastro Bar🍸.\nCoctelería y Platillos Gourmet.')).toBe(
      'Gastro Bar🍸. Coctelería y Platillos Gourmet.',
    )
  })

  it('no deja saltos, dobles espacios ni espacios en los bordes', () => {
    const plano = aplanarDescripcion('  Hola   mundo \r\n\r\n Segunda   línea  ')
    expect(plano).not.toMatch(/\n|\r|\s{2,}|^\s|\s$/)
  })
})

describe('quitar el nombre repetido al principio', () => {
  it('lo quita cuando le sigue un separador y queda texto de verdad', () => {
    expect(
      quitarNombre(
        'Marie Panadería Artesanal. Pan dulce artesanal delicioso, pan de caja con masa madre.',
        'Marie Panadería Artesanal',
      ),
    ).toBe('Pan dulce artesanal delicioso, pan de caja con masa madre.')
  })

  it('lo quita aunque el apóstrofo del texto sea curvo y el del nombre recto', () => {
    // huskys-ice-cream: el dato trae "Husky’s" (curvo) y el nombre es "Husky's".
    expect(
      quitarNombre(
        'Husky’s Ice Cream | Helados artesanales en Querétaro 🍦 Fusión de ice cream y gelato.',
        "Husky's Ice Cream",
      ),
    ).toBe('Helados artesanales en Querétaro 🍦 Fusión de ice cream y gelato.')
  })

  it('no lo quita cuando el nombre es el sujeto de la frase', () => {
    const cafele =
      'CAFELE es una cafetería con un concepto único y amigable. Nuestra especialidad es el Café.'
    expect(quitarNombre(cafele, 'Cafele')).toBe(cafele)
    const michoacana = 'La Michoacana es una marca de origen mexicano, con una gran trayectoria.'
    expect(quitarNombre(michoacana, 'La Michoacana')).toBe(michoacana)
  })

  it('no lo quita cuando la descripción sigue con más nombre', () => {
    // entrecot-asador: "Entrecot Asador Mexicano · Chef Hugo Tellez" no repite el nombre, lo amplía.
    const texto = 'Entrecot Asador Mexicano · Chef Hugo Tellez'
    expect(quitarNombre(texto, 'Entrecot Asador')).toBe(texto)
  })

  it('no deja una descripción vacía si solo decía el nombre', () => {
    expect(quitarNombre('Cafele. Café.', 'Cafele')).toBe('Cafele. Café.')
  })
})

describe('recortar sin dejar el texto a media frase', () => {
  it('no toca lo que cabe', () => {
    expect(recortar('Un texto corto.', 160)).toBe('Un texto corto.')
  })

  it('termina en una frase completa si deja al menos la mitad', () => {
    const texto = `${'Una frase de relleno. '.repeat(3)}Otra frase que se pasa del límite por mucho y mucho más.`
    const corte = recortar(texto, 70)
    expect(corte.length).toBeLessThanOrEqual(70)
    expect(corte).toMatch(/\.$/)
    expect(corte).not.toContain('…')
  })

  it('corta en una palabra, sin dos puntos ni conjunción colgante', () => {
    // burger-fries: se cortaba en "diga con certeza:…". marie: "pasteles decorados y…".
    const burger =
      'Creemos que todos deben disfrutar de una buena hamburguesa sin pagar de más y queremos que cada persona que pruebe Burger and Fries Forever diga con certeza: "¡Esto sí es una hamburguesa!".'
    const corte = recortar(burger, LIMITE_DESCRIPCION)
    expect(corte.length).toBeLessThanOrEqual(LIMITE_DESCRIPCION)
    expect(corte).toMatch(/certeza…$/)

    const marie =
      'Pan dulce artesanal delicioso, pan de caja con masa madre, pan de hotdog y hamburguesa para tu negocio y pasteles decorados y personalizados con mucho cariño.'
    const corte2 = recortar(marie, 150)
    expect(corte2).not.toMatch(/\b(y|de|con|para)…$/)
    expect(corte2).toMatch(/…$/)
  })

  it('no corta dentro de un emoji compuesto ni de una palabra', () => {
    const texto = `Hola ❤️‍🔥 ${'palabra '.repeat(12)}`
    const corte = recortar(texto, 60)
    expect(corte.length).toBeLessThanOrEqual(60)
    expect(corte.startsWith('Hola ❤️‍🔥 palabra')).toBe(true)
    expect(corte).not.toMatch(/‍…$/)
    const resto = corte.replace(/…$/, '').split(' ').slice(2)
    expect(resto.every((palabra) => palabra === 'palabra')).toBe(true)
  })
})

describe('el contexto de una descripción', () => {
  it('añade los giros y la zona del propio local', () => {
    expect(contextoDe(contexto(['Poke', 'Sushi'], 'Centro Zibatá'))).toBe(
      'Poke y Sushi en Centro Zibatá.',
    )
  })

  it('une los giros como en una frase, en el idioma de la ficha', () => {
    const conIdioma = (idioma: 'es' | 'en'): Contexto => ({
      ...contexto(['Poke', 'Sushi', 'Ramen'], 'Centro Zibatá'),
      idioma,
      conGiros: '{giros}',
    })
    expect(contextoDe(conIdioma('es'))).toBe('Poke, Sushi y Ramen')
    expect(contextoDe(conIdioma('en'))).toBe('Poke, Sushi, and Ramen')
  })

  it('nombra siempre los giros, aunque el texto del negocio ya los diga', () => {
    // La parte estandarizada es la misma en todas las fichas: lo que cambia es el texto del negocio.
    expect(contextoDe(contexto(['Pizza'], 'Paseo Zibatá'))).toBe('Pizza en Paseo Zibatá.')
    expect(contextoDe(contexto(['Poke', 'Sushi'], 'Centro Zibatá'))).toBe(
      'Poke y Sushi en Centro Zibatá.',
    )
  })

  it('sin giros dice solo dónde está', () => {
    expect(contextoDe(contexto([], 'Paseo Zibatá'))).toBe('En Paseo Zibatá.')
  })

  it('dice la zona una sola vez: "Paseo Zibatá" no lleva ", Zibatá" detrás', () => {
    expect(lugarDe('Paseo Zibatá')).toBe('Paseo Zibatá')
    expect(lugarDe('Xentric Anáhuac')).toBe('Xentric Anáhuac, Zibatá')
    expect(lugarDe(undefined)).toBe('Zibatá')
  })
})

describe('la descripción de una ficha', () => {
  const base = {
    nombre: 'Lilo Bowl Bar',
    contexto: contexto(['Açaí', 'Jugos'], 'Centro Zibatá'),
  }

  it('un texto largo también lleva el contexto delante, y se respeta si cabe (cafele)', () => {
    const cafele =
      'CAFELE es una cafetería con un concepto único y amigable. Nuestra especialidad es el Café.'
    expect(
      descripcionDeFicha({
        ...base,
        nombre: 'Cafele',
        descripcion: cafele,
        contexto: contexto(['Café'], 'MOL Pitahaya, Zibatá'),
      }),
    ).toBe(`Café en MOL Pitahaya, Zibatá. ${cafele}`)
  })

  it('si no cabe todo, se recorta el final del texto del negocio y el contexto queda entero', () => {
    const larga =
      'CAFELE es una cafetería con un concepto único y amigable. Nuestra especialidad es el Café, además de ofrecerte alimentos y bebidas de la más alta calidad.'
    const meta = descripcionDeFicha({
      ...base,
      nombre: 'Cafele',
      descripcion: larga,
      contexto: contexto(['Café'], 'MOL Pitahaya, Zibatá'),
    })
    expect(meta.startsWith('Café en MOL Pitahaya, Zibatá. CAFELE es una cafetería')).toBe(true)
    expect(meta.length).toBeLessThanOrEqual(LIMITE_DESCRIPCION)
  })

  it('completa una corta con los giros y la zona, sin tocar lo que dice el negocio', () => {
    expect(descripcionDeFicha({ ...base, descripcion: 'Bowl Revolution.' })).toBe(
      'Açaí y Jugos en Centro Zibatá. Bowl Revolution.',
    )
  })

  it('pone el contexto primero si la descripción no lo traía', () => {
    expect(descripcionDeFicha({ ...base, descripcion: 'Compartiendo tus mejores momentos' })).toBe(
      'Açaí y Jugos en Centro Zibatá. Compartiendo tus mejores momentos.',
    )
  })

  it('abre con el aviso de cierre temporal y no lo corta', () => {
    const meta = descripcionDeFicha({
      ...base,
      nombre: 'Agave Grill',
      aviso: 'Cerrado temporalmente. Por remodelación.',
      descripcion: '🌵 Cocina a la parrilla & experiencia gastronómica.',
      contexto: contexto(['Asador y Cortes'], 'Centro Zibatá'),
    })
    expect(meta.startsWith('Cerrado temporalmente. Por remodelación.')).toBe(true)
    expect(meta).toContain('Asador y Cortes en Centro Zibatá.')
    expect(meta).toContain('🌵 Cocina a la parrilla & experiencia gastronómica.')
    expect(meta.length).toBeLessThanOrEqual(LIMITE_DESCRIPCION)
  })

  it('dos fichas con el mismo texto largo se distinguen por el contexto', () => {
    // la-michoacana: dos sucursales con la misma descripción de 158 caracteres.
    const larga =
      'La Michoacana es una marca de origen mexicano, la cual ha tenido una gran trayectoria alrededor del mundo de los helados y paletas artesanales 100% naturales.'
    const a = descripcionDeFicha({
      ...base,
      nombre: 'La Michoacana',
      descripcion: larga,
      contexto: contexto(['Helados'], 'Paseo Zibatá'),
    })
    const b = descripcionDeFicha({
      ...base,
      nombre: 'La Michoacana',
      descripcion: larga,
      contexto: contexto(['Helados'], 'Xentric Zibatá'),
    })
    expect(a).not.toBe(b)
    expect(a.length).toBeLessThanOrEqual(LIMITE_DESCRIPCION)
    expect(b.length).toBeLessThanOrEqual(LIMITE_DESCRIPCION)
    expect(a).toMatch(/^Helados en Paseo Zibatá\./)
    expect(b).toMatch(/^Helados en Xentric Zibatá\./)
  })

  it('si el dato no trae descripción, dice al menos qué es y dónde está', () => {
    expect(descripcionDeFicha({ ...base, descripcion: '' })).toBe(
      `${base.nombre}. Açaí y Jugos en Centro Zibatá.`,
    )
    // Un nombre que ya acaba en punto no lo repite.
    expect(descripcionDeFicha({ ...base, nombre: "Carl's Jr.", descripcion: '' })).toBe(
      "Carl's Jr. Açaí y Jugos en Centro Zibatá.",
    )
  })
})

describe('detectar lo que se repite', () => {
  it('marca los índices cuya clave aparece más de una vez, sin distinguir mayúsculas', () => {
    expect([...repetidos(['Luka', 'Café', 'luka', 'Sinforosa'])].sort()).toEqual([0, 2])
    expect(repetidos(['a', 'b', 'c']).size).toBe(0)
  })
})
