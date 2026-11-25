import { ICONOS_DE_MASCOTAS } from '../components/icons/iconos-de-mascotas.tsx'
import { hasCategoryIcon } from '../components/icons/registro-de-iconos.tsx'

/** ¿Tiene dibujo este nombre, en el registro general o en el fragmento de un sector? */
export function tieneDibujo(nombre: string): boolean {
  return hasCategoryIcon(nombre) || Object.hasOwn(ICONOS_DE_MASCOTAS, nombre)
}
