/**
 * Los catálogos enteros, con todos los grupos. Solo los usan el build y las pruebas.
 *
 * El navegador no importa este archivo: carga el catálogo base y pide cada grupo junto con el
 * componente que lo muestra (`cargarGrupo`). El build, en cambio, necesita todos los textos a la vez
 * para escribir el HTML de cada página, y es lo único que lee el grupo `seo-build`.
 */
import { en } from './en.ts'
import { es } from './es.ts'
import { aboutEn } from './grupos/about.en.ts'
import { aboutEs } from './grupos/about.es.ts'
import { onboardingEn } from './grupos/onboarding.en.ts'
import { onboardingEs } from './grupos/onboarding.es.ts'
import { seoBuildEn } from './grupos/seo-build.en.ts'
import { seoBuildEs } from './grupos/seo-build.es.ts'

export const esCompleto = { ...es, ...aboutEs, ...onboardingEs, ...seoBuildEs }
export const enCompleto = { ...en, ...aboutEn, ...onboardingEn, ...seoBuildEn }
