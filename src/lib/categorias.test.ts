import { describe, expect, it } from 'vitest'
import { lista } from './categorias.ts'

describe('lista', () => {
  it('une con "y" y con "and", como siempre', () => {
    expect(lista(['Café', 'Tacos', 'Pizza'], 'es')).toBe('Café, Tacos y Pizza')
    expect(lista(['Coffee', 'Tacos', 'Pizza'], 'en')).toBe('Coffee, Tacos, and Pizza')
    expect(lista(['Café', 'Tacos'], 'es')).toBe('Café y Tacos')
  })

  it('en español separa todo con comas si un nombre ya lleva "y", para no enredar las dos', () => {
    expect(lista(['Peluquería', 'Manicura y Pedicura', 'Cejas y Pestañas'], 'es')).toBe(
      'Peluquería, Manicura y Pedicura, Cejas y Pestañas',
    )
    expect(lista(['Manicura y Pedicura', 'Spa'], 'es')).toBe('Manicura y Pedicura, Spa')
  })

  it('en inglés no cambia: los nombres usan "&"', () => {
    expect(lista(['Hair Salon', 'Manicure & Pedicure', 'Brows & Lashes'], 'en')).toBe(
      'Hair Salon, Manicure & Pedicure, and Brows & Lashes',
    )
  })
})
