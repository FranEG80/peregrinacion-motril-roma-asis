import { describe, expect, it } from 'vitest';
import { pilgrimage } from '../data/pilgrimage';

describe('contenido de la peregrinación', () => {
  it('contiene exactamente cinco días ordenados', () => {
    expect(pilgrimage.days).toHaveLength(5);
    expect(pilgrimage.days.map((day) => day.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('no mezcla imágenes de muestra con el itinerario editorial', () => {
    expect(pilgrimage.days.flatMap((day) => day.places).every((place) => place.photos.length === 0)).toBe(true);
  });
});
