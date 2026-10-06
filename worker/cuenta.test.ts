import { describe, expect, it } from 'vitest'
import { ALTA, CABECERA, huella, nuevaCuenta, nuevoSecreto, RESOLVER, secretoDe } from './cuenta.ts'

describe('el secreto del dispositivo', () => {
  it('no se repite', () => {
    const muchos = new Set(Array.from({ length: 500 }, () => nuevoSecreto()))
    expect(muchos.size).toBe(500)
  })

  it('tiene la forma que luego se valida, y solo esa', () => {
    for (let i = 0; i < 50; i++) expect(nuevoSecreto()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('no lleva relleno ni caracteres que haya que escapar en una URL', () => {
    // base64url, no base64: nada de `+`, `/` ni `=`, para que viaje en una cabecera sin sorpresas.
    for (let i = 0; i < 50; i++) expect(nuevoSecreto()).not.toMatch(/[+/=]/)
  })
})

describe('la huella', () => {
  it('es estable y distinta para cada secreto', async () => {
    const uno = nuevoSecreto()
    const otro = nuevoSecreto()
    expect(await huella(uno)).toBe(await huella(uno))
    expect(await huella(uno)).not.toBe(await huella(otro))
  })

  it('no deja adivinar el secreto', async () => {
    // Lo que de verdad importa: lo que se guarda no sirve para suplantar a nadie.
    const secreto = nuevoSecreto()
    expect(await huella(secreto)).not.toContain(secreto)
  })
})

describe('leer quién escribe', () => {
  const con = (valor?: string) => new Headers(valor === undefined ? {} : { [CABECERA]: valor })

  it('acepta un secreto bien formado', () => {
    const secreto = nuevoSecreto()
    expect(secretoDe(con(secreto))).toBe(secreto)
    expect(secretoDe(con(` ${secreto} `))).toBe(secreto)
  })

  it('descarta cualquier otra cosa sin ir a la base', () => {
    for (const malo of [
      undefined,
      '',
      '   ',
      'corto',
      `${nuevoSecreto()}x`,
      "' OR 1=1 --",
      '../../etc/passwd',
      `${nuevoSecreto().slice(0, 42)}+`,
    ]) {
      expect(secretoDe(con(malo))).toBeNull()
    }
  })
})

describe('el identificador de cuenta', () => {
  it('es opaco: no codifica nada de quien lo tiene', () => {
    const id = nuevaCuenta()
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(new Set(Array.from({ length: 500 }, () => nuevaCuenta())).size).toBe(500)
  })
})

describe('las consultas', () => {
  it('no guardan nada de la persona', () => {
    // La prueba que de verdad importa: lo que no está en el SQL no puede llegar a la base.
    const sql = [...ALTA, RESOLVER].join(' ').toLowerCase()
    for (const prohibido of ['ip', 'user_agent', 'correo', 'email', 'nombre', 'referente']) {
      expect(sql).not.toContain(prohibido)
    }
  })

  it('el secreto nunca entra en claro: lo que se guarda es `sujeto`', () => {
    expect(ALTA[1]).toContain('sujeto')
    expect(ALTA.join(' ')).not.toMatch(/secreto/i)
  })
})
