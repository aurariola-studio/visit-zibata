import { describe, expect, it } from 'vitest'
import { instagramDate, postDate, tiktokDate } from './post-date.ts'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const INSTAGRAM_EPOCH_MS = 1314220021721n

/** Codificación inversa para comprobar la aritmética de bits con instantes conocidos. */
function instagramShortcode(date: Date, sequence = 12345n): string {
  let mediaId = ((BigInt(date.getTime()) - INSTAGRAM_EPOCH_MS) << 23n) | sequence
  let code = ''
  while (mediaId > 0n) {
    code = ALPHABET[Number(mediaId % 64n)] + code
    mediaId /= 64n
  }
  return code
}

describe('fecha de publicación a partir del identificador', () => {
  it('decodifica IDs de TikTok (32 bits altos = segundos Unix)', () => {
    const instant = Date.UTC(2026, 1, 22, 10, 30, 0)
    const id = ((BigInt(instant / 1000) << 32n) | 987654n).toString()
    expect(tiktokDate(id).getTime()).toBe(instant)
  })

  it('decodifica shortcodes de Instagram (ms desde su epoch)', () => {
    const instant = new Date(Date.UTC(2025, 11, 9, 18, 0, 0))
    expect(instagramDate(instagramShortcode(instant)).getTime()).toBe(instant.getTime())
  })

  it('reconoce URLs de publicaciones y devuelve null para perfiles', () => {
    expect(
      postDate('https://www.tiktok.com/@cuenta/video/7609722967907486996')?.toISOString(),
    ).toMatch(/^2026-02-22/)
    expect(postDate('https://www.instagram.com/p/C4LvYCyotQc/')?.toISOString()).toMatch(
      /^2024-03-06/,
    )
    expect(postDate('https://www.instagram.com/cuenta/')).toBeNull()
    expect(() => instagramDate('no válido!')).toThrow()
  })
})
