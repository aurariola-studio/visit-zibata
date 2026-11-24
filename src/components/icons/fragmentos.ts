/**
 * Los iconos que viven fuera del registro general, y en qué fragmento. Es solo una tabla de nombres a propósito:
 * `CategoryIcon.tsx` la lee en el paquete inicial para saber qué fragmento pedir, y los dibujos se quedan en el
 * fragmento (`iconos-de-<sector>.tsx`). Una prueba (`src/data/iconos.test.ts`) exige que esta tabla y cada
 * fragmento digan lo mismo, y que ningún nombre esté también en el registro general.
 *
 * Para un sector nuevo con dibujos pesados: su fragmento, su entrada aquí y su cargador en `CategoryIcon.tsx`. Si
 * caben en el registro general (`iconosJs`), no hace falta nada de esto.
 */
export type Fragmento = 'mascotas'

export const FRAGMENTO_DE_ICONO: Readonly<Record<string, Fragmento>> = {
  'estetica-canina': 'mascotas',
  'hospital-veterinario': 'mascotas',
  hueso: 'mascotas',
  veterinaria: 'mascotas',
}
