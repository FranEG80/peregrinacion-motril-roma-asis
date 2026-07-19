import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

type ManifestItem = {
  key: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
};

type Manifest = {
  version: 1;
  generatedAt: string;
  items: ManifestItem[];
};

const root = resolve(import.meta.dirname, '..');
const dataDirectory = resolve(root, 'data');
const manifestPath = resolve(dataDirectory, 'gallery-manifest.json');
const execFileAsync = promisify(execFile);

function webpDimensions(buffer: Buffer, key: string) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`${key} no es un archivo WebP válido.`);
  }

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === 'VP8X' && dataOffset + 10 <= buffer.length) {
      return {
        width: buffer.readUIntLE(dataOffset + 4, 3) + 1,
        height: buffer.readUIntLE(dataOffset + 7, 3) + 1,
      };
    }

    if (chunkType === 'VP8 ' && dataOffset + 10 <= buffer.length) {
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === 'VP8L' && dataOffset + 5 <= buffer.length) {
      const bits = buffer.readUInt32LE(dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  throw new Error(`No se han podido leer las dimensiones de ${key}.`);
}

async function videoDimensions(path: string, key: string) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path,
  ]);
  const result = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number }> };
  const stream = result.streams?.[0];
  if (!stream?.width || !stream.height) throw new Error(`No se han podido leer las dimensiones de ${key}.`);
  return { width: stream.width, height: stream.height };
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
let updated = 0;

for (const item of manifest.items) {
  const path = resolve(dataDirectory, item.key);
  if (!path.startsWith(`${dataDirectory}/`)) throw new Error(`Ruta de medio no válida: ${item.key}`);
  const dimensions = item.mediaType === 'image'
    ? webpDimensions(await readFile(path), item.key)
    : await videoDimensions(path, item.key);
  if (item.width !== dimensions.width || item.height !== dimensions.height) {
    item.width = dimensions.width;
    item.height = dimensions.height;
    updated += 1;
  }
}

if (updated) {
  manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`${updated} medios actualizados.`);
