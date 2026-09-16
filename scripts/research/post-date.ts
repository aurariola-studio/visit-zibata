/**
 * Fecha de publicación a partir del identificador público de una publicación, sin descargar contenido:
 * - TikTok: los 32 bits altos del ID de vídeo/foto son el instante Unix (segundos).
 * - Instagram: el shortcode codifica el ID de medio; sus 41 bits altos son milisegundos desde el epoch
 *   de Instagram (2011-08-24T21:07:01.721Z).
 * Uso: node scripts/research/post-date.ts <url> [<url> …]
 */
const INSTAGRAM_EPOCH_MS = 1314220021721n
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function tiktokDate(id: string): Date {
  return new Date(Number(BigInt(id) >> 32n) * 1000)
}

export function instagramDate(shortcode: string): Date {
  let mediaId = 0n
  for (const char of shortcode) {
    const value = ALPHABET.indexOf(char)
    if (value < 0) throw new Error(`Shortcode no válido: ${shortcode}`)
    mediaId = mediaId * 64n + BigInt(value)
  }
  return new Date(Number((mediaId >> 23n) + INSTAGRAM_EPOCH_MS))
}

export function postDate(url: string): Date | null {
  const tiktok = url.match(/tiktok\.com\/@[^/]+\/(?:video|photo)\/(\d{15,})/)
  if (tiktok?.[1]) return tiktokDate(tiktok[1])
  const instagram = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels)\/([A-Za-z0-9_-]{8,14})/)
  if (instagram?.[1]) return instagramDate(instagram[1])
  return null
}

if (import.meta.main) {
  for (const url of process.argv.slice(2)) {
    const date = postDate(url)
    console.log(`${date ? date.toISOString().slice(0, 10) : 'sin fecha'}  ${url}`)
  }
}
