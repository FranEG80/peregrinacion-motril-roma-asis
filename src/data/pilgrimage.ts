import { pilgrimageSchema, type PhotoAsset } from '../domain/pilgrimage';
import itinerary from './itinerary.json';

const images = [
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=86&fm=webp',
  'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1600&q=86&fm=webp',
  'https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=1600&q=86&fm=webp',
  'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1600&q=86&fm=webp',
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=86&fm=webp',
];

function placeholderPhoto(day: number, place: string, offset: number, caption: string): PhotoAsset[] {
  return [{
    id: `d${day}-${place}-1`,
    objectKey: `roma/dia-${String(day).padStart(2, '0')}/${place}/1.jpg`,
    src: images[offset % images.length],
    width: 1600,
    height: 1067,
    originalBytes: 5_000_000,
    webpBytes: 2_400_000,
    caption,
  }];
}

// El JSON es la fuente editorial; las imágenes remotas son marcadores hasta importar el archivo real en R2.
export const pilgrimage = pilgrimageSchema.parse({
  ...itinerary,
  days: itinerary.days.map((day, dayIndex) => ({
    ...day,
    places: day.places.map((place, placeIndex) => ({
      ...place,
      sequence: placeIndex + 1,
      certainty: place.certainty as 'confirmed' | 'probable',
      photos: place.hasPhotos
        ? placeholderPhoto(
            day.number,
            place.slug,
            dayIndex + placeIndex,
            `Recuerdo de ${place.name} durante la peregrinación por ${day.city}.`,
          )
        : [],
      videos: [],
    })),
  })),
});

export const allPhotos = pilgrimage.days.flatMap((day) =>
  day.places.flatMap((place) => place.photos.map((photo) => ({ ...photo, day, place }))),
);

export function getDay(slug: string) {
  return pilgrimage.days.find((day) => day.slug === slug);
}
