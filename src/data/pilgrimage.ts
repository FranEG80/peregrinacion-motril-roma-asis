import { pilgrimageSchema } from '../domain/pilgrimage';
import itinerary from './itinerary.json';

const dayCopy: Record<string, { title: string; summary: string }> = {
  'day-1': { title: 'Llegada a Roma y San Juan de Letrán', summary: 'Llegada por Civitavecchia, visita al conjunto de San Juan de Letrán y recorrido por las plazas, fuentes y monumentos del centro de Roma.' },
  'day-2': { title: 'El Vaticano', summary: 'Una jornada completa en el Vaticano: Plaza y Basílica de San Pedro, celebración, Museos Vaticanos y grutas papales.' },
  'day-3': { title: 'Santa María la Mayor, San Pablo y catacumbas', summary: 'Santa María la Mayor y otras basílicas, la Roma imperial, San Pablo Extramuros y la visita sin fotografías a las catacumbas.' },
  'day-4': { title: 'Llegada a Asís y san Carlo Acutis', summary: 'Llegada a Asís, Santa Clara, la Catedral de San Rufino, la memoria de san Carlo Acutis, San Francisco y la Porciúncula.' },
  'day-5': { title: 'Misa en Rivotorto, tiempo libre y regreso', summary: 'Eucaristía en Rivotorto, tiempo libre para el último paseo por Asís y vuelta a España.' },
};
const catacombs = itinerary.days.flatMap((day) => day.places).find((place) => place.id === 'catacumbas-san-calixto');

// El JSON conserva el itinerario editorial; el archivo multimedia se obtiene del manifiesto privado de R2.
export const pilgrimage = pilgrimageSchema.parse({
  ...itinerary,
  days: itinerary.days.map((day) => ({
    ...day,
    ...dayCopy[day.id],
    places: [
      ...day.places.filter((place) => place.id !== 'catacumbas-san-calixto'),
      ...(day.id === 'day-3' && catacombs ? [catacombs] : []),
    ].map((place, placeIndex) => ({
      ...place,
      sequence: placeIndex + 1,
      certainty: place.certainty as 'confirmed' | 'probable',
      photos: [],
      videos: [],
    })),
    cover: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"%3E%3Crect width="100%25" height="100%25" fill="%23241f1b"/%3E%3C/svg%3E',
  })),
});

export function getDay(slug: string) {
  return pilgrimage.days.find((day) => day.slug === slug);
}
