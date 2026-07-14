import { describe, expect, it } from 'vitest';
import { allPhotos, pilgrimage } from '../data/pilgrimage';

describe('contenido de la peregrinación', () => {
  it('contiene exactamente cinco días ordenados', () => {
    expect(pilgrimage.days).toHaveLength(5);
    expect(pilgrimage.days.map((day) => day.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('todas las fotos tienen pie explicativo utilizable como alt', () => {
    expect(allPhotos.length).toBeGreaterThan(0);
    expect(allPhotos.every((photo) => photo.caption.trim().length > 20)).toBe(true);
  });
});
