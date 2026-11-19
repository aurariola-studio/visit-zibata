import type { Forma } from '../es.ts'

export const onboardingEs = {
  'onboarding.step1.title': '¿Cómo me muevo por el mapa?',
  'onboarding.step1.body':
    'Arrastra para recorrer Zibatá, pellizca o usa la rueda para acercarte, y gira con dos dedos o con clic derecho. Toca una zona para ver qué hay, y usa los botones de la esquina para acercar, girar o volver a la vista general.',
  'onboarding.step2.title': '¿Cómo busco y filtro?',
  'onboarding.step2.body':
    'Escribe lo que buscas o elige una categoría. Arriba también puedes acotar por zona o dejar solo lo que está abierto ahora, y quitar cualquier filtro cuando quieras.',
  'onboarding.step3.title': '¿Qué encuentro en la ficha?',
  'onboarding.step3.body':
    'Aquí encuentras el horario, el contacto y las redes, la dirección y cómo llegar. También puedes compartir la ficha con quien quieras.',
  'onboarding.step4.title': '¿Qué pasa con lo que guardo?',
  'onboarding.step4.body':
    'Toca el corazón para guardar el lugar, marca el día en que fuiste y califica con estrellas. También verás cuántas personas lo han guardado.',
  'onboarding.step5.title': '¿Cómo sugiero un cambio?',
  'onboarding.step5.body':
    '¿Viste un horario equivocado, un teléfono que ya no funciona o un lugar que cerró? ¿Tienes un local en Zibatá que quieres promocionar o actualizar? Escríbenos desde "Sugiere un cambio o contáctanos". Nos encantará leerte.',
  'onboarding.demo.place2': 'Cafetería del parque',
  'onboarding.demo.place3': 'Pizzería de la plaza',
  'onboarding.demo.place4': 'Café de la Abuela',
  'onboarding.demo.place5': 'Desayunos del Día',
  'onboarding.demo.place6': 'Café de la Ciudad',
  'onboarding.demo.query': 'café',
  'onboarding.demo.description': 'Café de barrio con desayunos y pan del día.',
  'onboarding.next': 'Siguiente',
  'onboarding.skip': 'Saltar',
  'onboarding.start': 'Empezar a explorar',
  'onboarding.close': 'Cerrar',
  'onboarding.progress': 'Paso {current} de {total}',
} as const

export type GrupoOnboarding = Forma<typeof onboardingEs>
