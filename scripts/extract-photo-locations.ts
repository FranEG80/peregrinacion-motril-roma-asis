import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import exifr from 'exifr';
import { pilgrimage } from '../src/data/pilgrimage';
import { classifyPoi, type Coordinates, type PointOfInterest } from '../src/domain/geo';

interface ManifestItem {
  id: string;
  key: string;
  mediaType: 'image' | 'video';
  capturedAt: string;
}

interface Manifest {
  items: ManifestItem[];
}

interface LocationItem extends Coordinates {
  poiId?: string;
  label: string;
  inferred?: boolean;
}

interface LocationFile {
  version: 1;
  generatedAt: string;
  items: Record<string, LocationItem>;
}

interface ReverseAddress {
  display_name?: string;
  address?: Record<string, string | undefined>;
}

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'data/gallery-manifest.json');
const outputPath = resolve(root, 'src/data/photo-locations.json');
const cachePath = resolve(root, 'scripts/.cache/nominatim.json');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const onlyArgument = args.find((arg) => arg.startsWith('--only='));
const onlyIndex = args.indexOf('--only');
const only = onlyArgument?.slice('--only='.length) || (onlyIndex >= 0 ? args[onlyIndex + 1] : undefined);

const pois: PointOfInterest[] = pilgrimage.days.flatMap((day) => day.places)
  .filter((place): place is typeof place & { coordinates: NonNullable<typeof place.coordinates> } => Boolean(place.coordinates))
  .map((place) => ({ id: place.id, name: place.name, coordinates: place.coordinates }));

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
const selectedItems = only
  ? manifest.items.filter((item) => item.id === only || item.key.startsWith(only))
  : manifest.items;

let existing: LocationFile = { version: 1, generatedAt: '', items: {} };
try {
  existing = JSON.parse(await readFile(outputPath, 'utf8')) as LocationFile;
} catch {}

let reverseCache: Record<string, ReverseAddress> = {};
try {
  reverseCache = JSON.parse(await readFile(cachePath, 'utf8')) as Record<string, ReverseAddress>;
} catch {}

const positions = new Map<string, Coordinates>();
const resolved = new Map<string, LocationItem>();
const relationCounts = new Map<string, 'inside' | 'nearby' | 'distant'>();
let cursor = 0;

async function readGps(filePath: string) {
  try {
    return await exifr.gps(filePath);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Unknown file format')) throw error;
  }

  const file = await readFile(filePath);
  if (file.subarray(0, 4).toString('ascii') !== 'RIFF' || file.subarray(8, 12).toString('ascii') !== 'WEBP') return undefined;
  let offset = 12;
  while (offset + 8 <= file.length) {
    const type = file.subarray(offset, offset + 4).toString('ascii');
    const length = file.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 'EXIF') return exifr.gps(file.subarray(start, start + length));
    offset = start + length + (length % 2);
  }
  return undefined;
}

async function extractWorker() {
  while (cursor < selectedItems.length) {
    const item = selectedItems[cursor];
    cursor += 1;
    if (!force && existing.items[item.id]) {
      const location = existing.items[item.id];
      positions.set(item.id, location);
      resolved.set(item.id, location);
      continue;
    }
    if (item.mediaType !== 'image') continue;
    try {
      const gps = await readGps(resolve(root, 'data', item.key));
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
        positions.set(item.id, { lat: gps.latitude, lon: gps.longitude });
      }
    } catch {}
  }
}

await Promise.all(Array.from({ length: Math.min(12, selectedItems.length) }, () => extractWorker()));

function roundedKey(position: Coordinates) {
  return `${position.lat.toFixed(4)},${position.lon.toFixed(4)}`;
}

function addressLabel(result: ReverseAddress) {
  const address = result.address || {};
  const street = address.road || address.pedestrian || address.footway || address.path || address.square || address.neighbourhood || address.suburb;
  const city = address.city || address.town || address.village || address.municipality || address.county;
  const parts = [street, city].filter((part, index, values): part is string => Boolean(part) && values.indexOf(part) === index);
  if (parts.length) return parts.join(', ');
  const fallback = result.display_name?.split(',').slice(0, 2).join(',').trim();
  return fallback || undefined;
}

async function reverseGeocode(position: Coordinates) {
  const key = roundedKey(position);
  if (reverseCache[key]) return addressLabel(reverseCache[key]);
  if (dryRun) return undefined;

  const email = process.env.NOMINATIM_EMAIL?.trim();
  if (!email) throw new Error('Define NOMINATIM_EMAIL para completar la geocodificación inversa.');
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(position.lat));
  url.searchParams.set('lon', String(position.lon));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'es');
  url.searchParams.set('email', email);
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'es',
      'User-Agent': `peregrinacion-motril-roma/1.0 (${email})`,
    },
  });
  if (!response.ok) throw new Error(`Nominatim ha respondido ${response.status}.`);
  const result = await response.json() as ReverseAddress;
  reverseCache[key] = result;
  await mkdir(resolve(cachePath, '..'), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(reverseCache, null, 2)}\n`);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_100));
  return addressLabel(result);
}

for (const item of selectedItems) {
  if (resolved.has(item.id)) continue;
  const position = positions.get(item.id);
  if (!position) continue;
  const classified = classifyPoi(position, pois);
  if (!classified) continue;
  relationCounts.set(item.id, classified.relation);
  if (classified.relation === 'inside') {
    resolved.set(item.id, { ...position, poiId: classified.poi.id, label: classified.poi.name });
  } else if (classified.relation === 'nearby') {
    resolved.set(item.id, { ...position, poiId: classified.poi.id, label: `Cerca de ${classified.poi.name}` });
  } else {
    const label = await reverseGeocode(position);
    if (label) resolved.set(item.id, { ...position, label });
  }
}

const byDay = new Map<string, ManifestItem[]>();
for (const item of selectedItems) {
  const day = item.key.split('/')[0];
  byDay.set(day, [...(byDay.get(day) || []), item]);
}

for (const items of byDay.values()) {
  const located = items.filter((item) => resolved.has(item.id));
  for (const item of items) {
    if (resolved.has(item.id)) continue;
    const capturedAt = Date.parse(item.capturedAt);
    const nearest = located
      .map((candidate) => ({ candidate, difference: Math.abs(Date.parse(candidate.capturedAt) - capturedAt) }))
      .filter(({ difference }) => difference <= 10 * 60 * 1000)
      .sort((left, right) => left.difference - right.difference)[0]?.candidate;
    if (!nearest) continue;
    const inherited = resolved.get(nearest.id);
    if (inherited) resolved.set(item.id, { ...inherited, inferred: true });
  }
}

const summary = [...byDay].map(([day, items]) => ({
  day,
  total: items.length,
  gps: items.filter((item) => positions.has(item.id)).length,
  poi: items.filter((item) => relationCounts.get(item.id) === 'inside').length,
  nearby: items.filter((item) => relationCounts.get(item.id) === 'nearby').length,
  address: items.filter((item) => relationCounts.get(item.id) === 'distant' && resolved.has(item.id)).length,
  inferred: items.filter((item) => resolved.get(item.id)?.inferred).length,
  unresolved: items.filter((item) => !resolved.has(item.id)).length,
}));
console.table(summary);

if (!dryRun) {
  const outputItems = only ? { ...existing.items } : {};
  for (const [id, location] of resolved) outputItems[id] = location;
  const output: LocationFile = { version: 1, generatedAt: new Date().toISOString(), items: outputItems };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Ubicaciones escritas: ${Object.keys(outputItems).length}`);
}
