export interface Coordinates {
  lat: number;
  lon: number;
}

export interface PointOfInterest {
  id: string;
  name: string;
  coordinates: Coordinates & { radiusM?: number };
}

const earthRadiusM = 6_371_000;

export function haversineMeters(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(to.lat - from.lat);
  const deltaLon = radians(to.lon - from.lon);
  const fromLat = radians(from.lat);
  const toLat = radians(to.lat);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}

export function findNearestPoi(position: Coordinates, pois: PointOfInterest[]) {
  return pois.reduce<{ poi: PointOfInterest; distanceM: number } | undefined>((nearest, poi) => {
    const distanceM = haversineMeters(position, poi.coordinates);
    return !nearest || distanceM < nearest.distanceM ? { poi, distanceM } : nearest;
  }, undefined);
}

export function classifyPoi(position: Coordinates, pois: PointOfInterest[], nearbyRadiusM = 250) {
  const nearest = findNearestPoi(position, pois);
  if (!nearest) return undefined;
  const radiusM = nearest.poi.coordinates.radiusM ?? 130;
  if (nearest.distanceM <= radiusM) return { ...nearest, relation: 'inside' as const };
  if (nearest.distanceM <= nearbyRadiusM) return { ...nearest, relation: 'nearby' as const };
  return { ...nearest, relation: 'distant' as const };
}
