/**
 * Zonas y puntos de interés viven en el mismo archivo (`plazas.json`) y se distinguen por `tipo`. Una zona tiene
 * contorno, página y sitio en las listas; un punto de interés es un solo negocio en su propio lugar y no tiene
 * ninguna de las tres cosas (la regla, en docs/DATOS.md).
 *
 * Sin dependencias a propósito: lo leen el navegador, el Worker, el panel y los scripts.
 */
import type { Plaza, Zona } from '../types/domain.ts'

export const esPunto = (plaza: Pick<Plaza, 'tipo'>): boolean => plaza.tipo === 'punto'

export const esZona = (plaza: Plaza): plaza is Zona =>
  !esPunto(plaza) && plaza.geometry !== undefined
