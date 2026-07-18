import { describe, expect, it } from 'vitest';
import { classifyPoi, haversineMeters } from './geo';

const poi = {
  id: 'san-pedro',
  name: 'Basílica de San Pedro',
  coordinates: { lat: 41.9022, lon: 12.4539, radiusM: 130 },
};

describe('geolocalización editorial', () => {
  it('calcula distancias en metros con Haversine', () => {
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111_195, -1);
  });

  it('respeta el umbral del POI y el límite de cercanía', () => {
    expect(classifyPoi(poi.coordinates, [poi])?.relation).toBe('inside');
    const roughly130mNorth = { lat: poi.coordinates.lat + 130 / 111_195, lon: poi.coordinates.lon };
    expect(classifyPoi(roughly130mNorth, [poi])?.relation).toBe('inside');
    const roughly200mNorth = { lat: poi.coordinates.lat + 200 / 111_195, lon: poi.coordinates.lon };
    expect(classifyPoi(roughly200mNorth, [poi])?.relation).toBe('nearby');
    const roughly300mNorth = { lat: poi.coordinates.lat + 300 / 111_195, lon: poi.coordinates.lon };
    expect(classifyPoi(roughly300mNorth, [poi])?.relation).toBe('distant');
  });
});
