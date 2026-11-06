import { describe, expect, it } from 'vitest'
import { isGoogleMapsUrl, isSafePhotoSrc } from './rules.ts'

describe('isSafePhotoSrc', () => {
  it('acepta una ruta relativa a public/ y una URL https', () => {
    expect(isSafePhotoSrc('photos/tomassa-1.webp')).toBe(true)
    expect(isSafePhotoSrc('https://cdn.ejemplo.mx/fotos/a.webp')).toBe(true)
  })

  it('rechaza esquemas peligrosos, rutas absolutas y http', () => {
    for (const malo of [
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '/etc/passwd',
      'http://x.mx/a.webp',
      '',
    ]) {
      expect(isSafePhotoSrc(malo), malo).toBe(false)
    }
  })

  it('rechaza lo que cerraría un atributo HTML o lo ensuciaría', () => {
    for (const malo of [
      'a.webp" onerror="alert(1)',
      "a.webp' onerror='alert(1)",
      'a.webp><script>',
      'a`b.webp',
      'a\\b.webp',
      'a b.webp',
      'a.webp\nb',
      'https://x.mx/a.webp" onload="x',
    ]) {
      expect(isSafePhotoSrc(malo), JSON.stringify(malo)).toBe(false)
    }
  })
})

describe('isGoogleMapsUrl', () => {
  it('acepta los dominios de Google Maps y sus países', () => {
    for (const bien of [
      'https://www.google.com/maps/place/x',
      'https://google.com.mx/maps?q=x',
      'https://maps.google.com/?q=x',
      'https://maps.google.co.uk/?q=x',
      'https://maps.app.goo.gl/abc',
      'https://goo.gl/maps/abc',
    ]) {
      expect(isGoogleMapsUrl(bien), bien).toBe(true)
    }
  })

  it('rechaza un dominio ajeno que empieza por google.', () => {
    for (const mal of [
      'https://google.evil.example/maps',
      'https://google.com.evil.example/maps',
      'https://maps.google.evil.example/',
      'https://google.attacker/',
      'http://www.google.com/maps',
    ]) {
      expect(isGoogleMapsUrl(mal), mal).toBe(false)
    }
  })
})
