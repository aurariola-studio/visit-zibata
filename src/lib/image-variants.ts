/** Ruta de una variante generada por `npm run images:optimize`: `foto.webp` → `foto-480.avif`. */
export function variantPath(src: string, width: number, format: 'webp' | 'avif'): string {
  return src.replace(/\.(webp|avif|jpe?g|png)$/i, `-${width}.${format}`)
}
