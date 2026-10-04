import { describe, expect, it } from 'vitest'
import { cleanDescription, cleanPhone, parseHoursText } from './owner-text.ts'

describe('cleanDescription', () => {
  it('conserva los emojis del negocio y normaliza las letras decorativas', () => {
    expect(cleanDescription('🌽 Elotes y esquites 💛 Tus nuevos favoritos❤️‍🔥')).toBe(
      '🌽 Elotes y esquites 💛 Tus nuevos favoritos❤️‍🔥',
    )
    expect(cleanDescription('𝙐𝙣𝙖 𝙗𝙪𝙚𝙣𝙖 𝙗𝙞𝙧𝙧𝙞𝙖.')).toBe('Una buena birria.')
    expect(cleanDescription('D´Lu - Cafetería con alma francesa.')).toBe(
      'D’Lu - Cafetería con alma francesa.',
    )
  })

  it('respeta los saltos de línea y quita las viñetas de cada uno', () => {
    expect(cleanDescription('Fresh drinks\n• Fresh habits\n🥤 Juice Bar')).toBe(
      'Fresh drinks\nFresh habits\n🥤 Juice Bar',
    )
    // Las líneas en blanco de más no cuentan como salto.
    expect(cleanDescription('Pasta fresca artesanal.\n\n🍝 Pastas\n')).toBe(
      'Pasta fresca artesanal.\n🍝 Pastas',
    )
  })

  it('a partir de la cuarta línea une el resto con " · "', () => {
    expect(cleanDescription('Uno\nDos\nTres\nCuatro\nCinco')).toBe('Uno\nDos\nTres\nCuatro · Cinco')
    // Una línea que ya termina en puntuación no necesita separador.
    expect(cleanDescription('Uno\nDos\nTres\nCuatro.\nCinco')).toBe('Uno\nDos\nTres\nCuatro. Cinco')
  })

  it('devuelve null cuando no queda texto', () => {
    expect(cleanDescription(null)).toBeNull()
    expect(cleanDescription('   ')).toBeNull()
    expect(cleanDescription('\n\n')).toBeNull()
  })
})

describe('cleanPhone', () => {
  it('unifica los formatos capturados a E.164', () => {
    expect(cleanPhone('446-116-3277')).toBe('+524461163277')
    expect(cleanPhone('+524426783769')).toBe('+524426783769')
    expect(cleanPhone('[442] 5498641')).toBe('+524425498641')
    expect(cleanPhone('(442) 602-8627')).toBe('+524426028627')
    expect(cleanPhone('+52 1 442 330 0104')).toBe('+524423300104')
    expect(cleanPhone('🥖(442)323-2343')).toBe('+524423232343')
  })

  it('rechaza lo que no reconoce en vez de inventarlo', () => {
    expect(cleanPhone('442 123')).toBeNull()
    expect(cleanPhone(null)).toBeNull()
  })
})

describe('parseHoursText', () => {
  it('lee el formato que copia Google, con turnos y días cerrados', () => {
    const { hours, problem } = parseHoursText(
      'martes\t9 a.m.–1 p.m., 6–10 p.m.\ndomingo\tCerrado\nlunes\t9 a.m.–1 p.m., 6–10 p.m.',
    )
    expect(problem).toBeNull()
    expect(hours).toEqual({
      mon: ['09:00-13:00', '18:00-22:00'],
      tue: ['09:00-13:00', '18:00-22:00'],
      sun: [],
    })
  })

  it('hereda el a.m./p.m. que solo aparece al final', () => {
    expect(parseHoursText('lunes\t2–11:30 p.m.').hours).toEqual({ mon: ['14:00-23:30'] })
    expect(parseHoursText('lunes\t12 p.m.–12 a.m.').hours).toEqual({ mon: ['12:00-00:00'] })
    expect(parseHoursText('lunes\t7 a.m.–9:55 p.m.').hours).toEqual({ mon: ['07:00-21:55'] })
  })

  it('entiende rangos de días escritos a mano', () => {
    expect(
      parseHoursText('Lunes a viernes 7:00am - 6:00pm\nSábados 8:00am - 3:00pm').hours,
    ).toEqual({
      mon: ['07:00-18:00'],
      tue: ['07:00-18:00'],
      wed: ['07:00-18:00'],
      thu: ['07:00-18:00'],
      fri: ['07:00-18:00'],
      sat: ['08:00-15:00'],
    })
    expect(parseHoursText('L-V 8-21/ S 8-18/ D 8-16').hours?.sun).toEqual(['08:00-16:00'])
    expect(parseHoursText('todos los días de 2 p.m. a 12 a.m').hours?.wed).toEqual(['14:00-00:00'])
    expect(parseHoursText('LUNES A DOMINGO DE 7 AM A 9:30 PM').hours?.sun).toEqual(['07:00-21:30'])
  })

  it('un día suelto corrige al rango que lo precede', () => {
    const { hours } = parseHoursText(
      'Lunes - Sábado 9am a 8 pm\nJueves Cerrado\nDomingo 9 am a 4 pm',
    )
    expect(hours?.thu).toEqual([])
    expect(hours?.mon).toEqual(['09:00-20:00'])
    expect(hours?.sun).toEqual(['09:00-16:00'])
  })

  it('entiende las letras sueltas de un día y las horas escritas antes de los días', () => {
    expect(parseHoursText('L - V : 8:30 am - 21:00 pm\nS A B : 9:00 am - 15:00 pm').hours).toEqual({
      mon: ['08:30-21:00'],
      tue: ['08:30-21:00'],
      wed: ['08:30-21:00'],
      thu: ['08:30-21:00'],
      fri: ['08:30-21:00'],
      sat: ['09:00-15:00'],
    })
    expect(parseHoursText('2:00PM - 1:00AM\nDOM-LUN').hours).toEqual({
      mon: ['14:00-01:00'],
      sun: ['14:00-01:00'],
    })
  })

  it('no adivina cuando faltan a.m./p.m. ni cuando no reconoce el formato', () => {
    expect(parseHoursText('L-D 3:30 - 9:30')).toEqual({
      hours: null,
      problem: 'horas sin a.m./p.m.',
    })
    expect(parseHoursText('abrimos cuando amanece')).toEqual({ hours: null, problem: 'sin horas' })
    expect(parseHoursText(null)).toEqual({ hours: null, problem: null })
  })
})
