/** Ruta de una variante generada por `npm run images:optimize`: `foto.webp` → `foto-480.avif`. */
export function variantPath(src: string, width: number, format: 'webp' | 'avif'): string {
  return src.replace(/\.(webp|avif|jpe?g|png)$/i, `-${width}.${format}`)
}

/** Los anchos de las variantes reducidas. Los comparten `images:optimize` y el paso de build. */
export const ANCHOS_DE_VARIANTE: readonly number[] = [480, 960]

/**
 * Las variantes que tiene una foto de la que solo se sabe el ancho. Cada una tiene que ser más estrecha que
 * la foto: ampliar una imagen no la mejora y solo pesa. Una foto que sube el panel no lista `variants`
 * (el Worker no tiene `sharp`), así que se deducen del ancho, y el build genera esos mismos archivos
 * (`scripts/images/derive-variants.ts`). Una foto sin ancho no tiene variantes.
 */
export function variantesDe(ancho: number | undefined): number[] {
  if (!ancho) return []
  return ANCHOS_DE_VARIANTE.filter((variante) => variante < ancho)
}
