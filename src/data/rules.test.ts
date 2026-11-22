import { describe, expect, it } from 'vitest'
import { isGoogleMapsUrl, isSafePhotoSrc, isWhatsappLink, problemaDeFotos } from './rules.ts'

describe('isWhatsappLink', () => {
  it('acepta los enlaces de WhatsApp por https, también los de una cuenta de empresa', () => {
    for (const bien of [
      'https://api.whatsapp.com/message/IVEPP7J4G46DC1',
      'https://api.whatsapp.com/send?phone=524422036240',
      'https://wa.me/message/ABC123',
      'https://wa.me/524422036240',
      'https://wa.link/abc123',
    ]) {
      expect(isWhatsappLink(bien), bien).toBe(true)
    }
  })

  it('rechaza lo que no es WhatsApp, lo que no es https y los dominios que solo lo parecen', () => {
    for (const mal of [
      'http://wa.me/message/ABC123',
      'https://example.com/message/ABC123',
      'https://wa.me.evil.example/x',
      'https://evil.example/wa.me',
      'javascript:alert(1)',
      '+524422036240',
      '',
    ]) {
      expect(isWhatsappLink(mal), mal).toBe(false)
    }
  })
})

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

describe('problemaDeFotos', () => {
  it('acepta ninguna foto y la de portada con su nombre', () => {
    expect(problemaDeFotos('x', [])).toBeNull()
    for (const formato of ['webp', 'jpg', 'png']) {
      expect(problemaDeFotos('x', [`images/places/x/portada.${formato}`])).toBeNull()
    }
  })

  it('rechaza otro nombre, la carpeta de otro local y una URL externa', () => {
    expect(problemaDeFotos('x', ['images/places/x/fachada.webp'])).toContain('portada.webp')
    expect(problemaDeFotos('x', ['images/places/y/portada.webp'])).toContain('portada.webp')
    expect(problemaDeFotos('x', ['https://cdn.example.com/portada.webp'])).toContain('portada.webp')
  })

  it('rechaza más de una foto', () => {
    const dos = ['images/places/x/portada.webp', 'images/places/x/portada-2.webp']
    expect(problemaDeFotos('x', dos)).toContain('solo la foto de portada')
  })
})
