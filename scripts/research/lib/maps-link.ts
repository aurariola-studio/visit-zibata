/** Coordenadas de un enlace de Maps ya resuelto: el pin (`!3d…!4d…`) o, si no hay, el centro (`@lat,lng`). */
export function coordinatesFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const pin = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (!pin) return null
  return { lat: Number(Number(pin[1]).toFixed(6)), lng: Number(Number(pin[2]).toFixed(6)) }
}
