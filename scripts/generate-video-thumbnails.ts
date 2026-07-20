import { execFile } from 'node:child_process';
import { readFile, mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { promisify } from 'node:util';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type ManifestItem = {
  key: string;
  mediaType: 'image' | 'video';
};

type Manifest = {
  version: 1;
  items: ManifestItem[];
};

const root = resolve(import.meta.dirname, '..');
const dataDirectory = resolve(root, 'data');
const args = process.argv.slice(2);
const upload = args.includes('--upload');
const force = args.includes('--force');
const bucketArgument = args.find((argument) => argument.startsWith('--bucket='));
const bucket = bucketArgument?.slice('--bucket='.length) || 'peregrinacion-motril-roma-2026';
const execFileAsync = promisify(execFile);

function thumbnailKey(key: string) {
  if (!key.endsWith('.mp4')) throw new Error(`El vídeo ${key} no tiene extensión MP4.`);
  return `thumbnail/${key.replace(/\.mp4$/, '.webp')}`;
}

function localPath(key: string) {
  const path = resolve(dataDirectory, key);
  if (!path.startsWith(`${dataDirectory}/`)) throw new Error(`Ruta de medio no válida: ${key}`);
  return path;
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function createThumbnail(item: ManifestItem) {
  const inputPath = localPath(item.key);
  const outputKey = thumbnailKey(item.key);
  const outputPath = localPath(outputKey);
  if (!force && await exists(outputPath)) return { key: outputKey, path: outputPath, created: false };

  await mkdir(dirname(outputPath), { recursive: true });
  const framePath = `${outputPath}.jpg`;
  await execFileAsync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-ss', '0.1', '-i', inputPath,
    '-y', '-frames:v', '1', '-vf', 'scale=min(960\\,iw):-2', '-c:v', 'mjpeg', '-q:v', '3', framePath,
  ]);
  try {
    try {
      await execFileAsync('cwebp', ['-quiet', '-q', '82', framePath, '-o', outputPath]);
    } catch {
      await execFileAsync('magick', [framePath, '-quality', '82', outputPath]);
    }
  } finally {
    await unlink(framePath).catch(() => undefined);
  }
  return { key: outputKey, path: outputPath, created: true };
}

if (upload) loadEnvFile(resolve(root, '.env'));
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
const s3 = upload && accountId && accessKeyId && secretAccessKey
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : undefined;

async function uploadThumbnail(record: { key: string; path: string }) {
  if (!s3) throw new Error('Faltan CLOUDFLARE_ACCOUNT_ID y las credenciales de R2 en .env.');
  const body = await readFile(record.path);
  try {
    const remote = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: record.key }));
    if (remote.ContentLength === body.byteLength) return false;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw error;
  }

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: record.key,
    Body: body,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return true;
}

const manifest = JSON.parse(await readFile(resolve(dataDirectory, 'gallery-manifest.json'), 'utf8')) as Manifest;
const videos = manifest.items.filter((item) => item.mediaType === 'video');
const records = [];

for (const video of videos) records.push(await createThumbnail(video));

let uploaded = 0;
if (upload) {
  for (const record of records) {
    if (await uploadThumbnail(record)) uploaded += 1;
  }
}

console.log(`${records.filter((record) => record.created).length} portadas creadas; ${upload ? `${uploaded} subidas a R2` : 'sin subida a R2'}.`);
