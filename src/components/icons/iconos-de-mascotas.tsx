/**
 * Los iconos del sector Mascotas, en un fragmento aparte. `CategoryIcon` lo pide solo cuando se pinta uno de estos
 * nombres (ver `fragmentos.ts`): el sector entra en la guía con un solo icono en la primera pantalla (la huella,
 * que va en el registro general) y el resto no hace falta hasta abrir el sector. Así el registro general
 * (`registro-de-iconos.tsx`, tope `iconosJs`) no crece con cada sector nuevo y cada sector paga su propio peso en
 * `iconosDeSectorJs`. Un sector nuevo con dibujos pesados sigue este molde: su fragmento, su lista en `fragmentos.ts`.
 */
import { conInsignia, custom, type IconComponent } from './dibujar.tsx'

/** Trazos del perro y del gato de Lucide (`dog`, `cat`, ISC), compartidos por los iconos de Mascotas. */
const PerroTrazos = (
  <>
    <path d="M11.25 16.25h1.5L12 17zM16 14v.5" />
    <path d="M4.42 11.247A13.2 13.2 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.7 11.7 0 0 0-.493-3.309M8 14v.5" />
    <path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5c-1.931.722-3.576-.297-3.656-1c-.113-.994 1.177-6.53 4-7c1.923-.321 3.651.845 3.651 2.235A7.5 7.5 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277c2.823.47 4.113 6.006 4 7c-.08.703-1.725 1.722-3.656 1c-1.261-.472-1.855-1.45-2.239-2.5" />
  </>
)
const GatoTrazos = (
  <>
    <path d="M12 5c.67 0 1.35.09 2 .26c1.78-2 5.03-2.84 6.42-2.26c1.4.58-.42 7-.42 7c.57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44c0 0-1.89-6.42-.5-7s4.72.23 6.5 2.23A9 9 0 0 1 12 5m-4 9v.5m8-.5v.5" />
    <path d="M11.25 16.25h1.5L12 17z" />
  </>
)

/** Hueso: Artículos para Mascotas. Tabler Icons `bone` (MIT). */
const Hueso = custom(
  <path d="M15 3a3 3 0 0 1 3 3a3 3 0 1 1-2.12 5.122l-4.758 4.758a3 3 0 1 1-5.117 2.297V18h-.176a3 3 0 1 1 2.298-5.115l4.758-4.758a3 3 0 0 1 2.12-5.122z" />,
)

/** Una caseta de perro: Hotel para Mascotas. Lucide `doghouse` (ISC). */
const CasaDePerro = custom(
  <>
    <path d="m2 9.718l8.82-6.333a2 2 0 0 1 2.36 0L22 9.718" />
    <path d="m20 8.282l-1.007 10.902A2 2 0 0 1 17 21H7a2 2 0 0 1-1.992-1.816L4 8.282" />
    <path d="M8.5 9.938a7 7 0 0 1 7 0M9 21v-5a3 3 0 0 1 6 0v5" />
  </>,
)

/**
 * La mascota a 0,78 arriba a la izquierda, con su trazo de 2 sin tocar (1,56 px en pantalla); la insignia va abajo a la
 * derecha con el mismo trazo y corta la línea de la mascota a su alrededor (ver `conInsignia`).
 */
const Perro = (
  <g transform="translate(0 0.1) scale(0.78)" strokeWidth={2}>
    {PerroTrazos}
  </g>
)
const Gato = (
  <g transform="translate(0 0.1) scale(0.78)" strokeWidth={2}>
    {GatoTrazos}
  </g>
)

/** Veterinarias y su giro Veterinaria: el perro con una cruz en un círculo que le muerde la barbilla. */
const Veterinaria = conInsignia(
  Perro,
  <circle cx="17.4" cy="17.4" r="7.38" />,
  <>
    <circle cx="17.4" cy="17.4" r="5.6" />
    <path d="M17.4 15.4v4M15.4 17.4h4" />
  </>,
)

/** Hospital Veterinario: el gato con el edificio de un hospital (cruz arriba, puerta abajo) en un cuadrado redondeado. */
const HospitalVeterinario = conInsignia(
  Gato,
  <rect x="10.82" y="10.82" width="14.16" height="14.16" rx="4.68" />,
  <>
    <rect x="12.6" y="12.6" width="10.6" height="10.6" rx="2.9" />
    <path d="M17.9 14.8v2.8M16.5 16.2h2.8" />
    <path d="M16.7 23.2v-1.2a1.2 1.2 0 0 1 2.4 0v1.2" />
  </>,
)

/** Estética para Mascotas: el perro con tres burbujas en las esquinas (anillos de 1,5 px). */
const EsteticaMascotas = custom(
  <>
    <g transform="translate(3.4 4.6) scale(.72)" strokeWidth={2.78}>
      {PerroTrazos}
    </g>
    <g strokeWidth={1.5}>
      <circle cx="3.6" cy="4" r="2" />
      <circle cx="20.2" cy="3.6" r="2.4" />
      <circle cx="21" cy="10.2" r="1.4" />
    </g>
  </>,
)

export const ICONOS_DE_MASCOTAS: Record<string, IconComponent> = {
  'casa-de-perro': CasaDePerro,
  'estetica-mascotas': EsteticaMascotas,
  'hospital-veterinario': HospitalVeterinario,
  hueso: Hueso,
  veterinaria: Veterinaria,
}
