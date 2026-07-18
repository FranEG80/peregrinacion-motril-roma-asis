import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { buildGalleryDay, type GalleryMedia } from '../src/data/gallery';
import { archiveObjectKey } from '../src/domain/archive';
import { pilgrimage } from '../src/data/pilgrimage';

interface ArchiveRecord {
  dayId: string;
  blockId?: string;
  name: string;
  objectKey: string;
  localPath: string;
  fileCount: number;
  bytes: number;
}

const root = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(root, 'tmp/static-zips');
const indexPath = resolve(outputDirectory, 'archives.json');
const publicIndexPath = resolve(root, 'src/data/archive-sizes.json');
const readmePath = resolve(outputDirectory, 'LEEME.txt');
const args = process.argv.slice(2);
const upload = args.includes('--upload') || args.includes('--upload-only');
const uploadOnly = args.includes('--upload-only');
const metadataOnly = args.includes('--metadata-only');
const onlyArgument = args.find((argument) => argument.startsWith('--only='));
const only = onlyArgument?.slice('--only='.length);
const bucketArgument = args.find((argument) => argument.startsWith('--bucket='));
const bucket = bucketArgument?.slice('--bucket='.length) || 'peregrinacion-motril-roma-2026';

function run(command: string, commandArgs: string[]) {
  return new Promise<void>((resolveRun, reject) => {
    const process = spawn(command, commandArgs, { cwd: root, stdio: 'inherit' });
    process.on('error', reject);
    process.on('exit', (code) => code === 0
      ? resolveRun()
      : reject(new Error(`${basename(command)} ha terminado con código ${code}.`)));
  });
}

function deduplicate(media: GalleryMedia[]) {
  return [...new Map(media.map((item) => [item.id, item])).values()];
}

async function createArchive(dayId: string, blockId: string | undefined, objectKey: string, media: GalleryMedia[]) {
  const uniqueMedia = deduplicate(media);
  const fileNames = uniqueMedia.map((item) => basename(item.key));
  if (new Set(fileNames).size !== fileNames.length) {
    throw new Error(`Hay nombres de archivo repetidos en ${objectKey}.`);
  }

  const localPath = resolve(outputDirectory, basename(objectKey));
  const sourcePaths = uniqueMedia.map((item) => resolve(root, 'data', item.key));
  await run('/usr/bin/zip', ['-0', '-q', '-j', '-FS', localPath, readmePath, ...sourcePaths]);
  const info = await stat(localPath);
  return {
    dayId,
    blockId,
    name: basename(objectKey),
    objectKey,
    localPath,
    fileCount: uniqueMedia.length,
    bytes: info.size,
  } satisfies ArchiveRecord;
}

async function generateArchives() {
  const manifest = JSON.parse(await readFile(resolve(root, 'data/gallery-manifest.json'), 'utf8')) as unknown;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(readmePath, [
    'Peregrinación a Roma y Asís · 7–11 de julio de 2026',
    '',
    'Este ZIP contiene las fotografías y los vídeos tal como están guardados en el álbum (WebP y MP4).',
    'No publiques fotografías de otras personas sin su permiso.',
    '',
  ].join('\n'));

  const records: ArchiveRecord[] = [];
  for (const sourceDay of pilgrimage.days) {
    if (only && only !== sourceDay.id && only !== sourceDay.slug) continue;
    const day = buildGalleryDay(sourceDay.slug, manifest, (key) => key);
    if (!day) throw new Error(`No se ha podido construir ${sourceDay.id}.`);

    const dayMedia = day.blocks.flatMap((block) => block.media);
    records.push(await createArchive(day.id, undefined, archiveObjectKey(day), dayMedia));

    for (const block of day.blocks) {
      if (!block.media.length) continue;
      records.push(await createArchive(day.id, block.id, archiveObjectKey(day, block), block.media));
    }
  }

  await writeFile(indexPath, `${JSON.stringify(records, null, 2)}\n`);
  return records;
}

async function uploadArchive(record: ArchiveRecord) {
  if (!s3) throw new Error('No se ha configurado el cliente de R2.');
  try {
    const remote = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: record.objectKey }));
    if (remote.ContentLength === record.bytes) {
      console.log(`Ya existe: ${record.name}`);
      return;
    }
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw error;
  }

  console.log(`Subiendo: ${record.name} (${(record.bytes / 1_048_576).toFixed(1)} MiB)`);
  const task = new Upload({
    client: s3,
    queueSize: 4,
    partSize: 16 * 1_048_576,
    leavePartsOnError: false,
    params: {
      Bucket: bucket,
      Key: record.objectKey,
      Body: createReadStream(record.localPath),
      ContentType: 'application/zip',
      ContentDisposition: `attachment; filename="${record.name}"`,
      CacheControl: 'private, max-age=86400',
    },
  });
  let reported = 0;
  task.on('httpUploadProgress', ({ loaded = 0 }) => {
    const percentage = Math.floor((loaded / record.bytes) * 10) * 10;
    if (percentage >= reported + 20) {
      reported = percentage;
      console.log(`  ${Math.min(percentage, 100)} %`);
    }
  });
  await task.done();
}

const records = uploadOnly || metadataOnly
  ? JSON.parse(await readFile(indexPath, 'utf8')) as ArchiveRecord[]
  : await generateArchives();

await writeFile(publicIndexPath, `${JSON.stringify({
  version: 1,
  items: Object.fromEntries(records.map((record) => [record.objectKey, record.bytes])),
}, null, 2)}\n`);

console.table(records.map((record) => ({
  day: record.dayId,
  block: record.blockId || 'día completo',
  files: record.fileCount,
  sizeMB: (record.bytes / 1_048_576).toFixed(1),
})));

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

if (upload) {
  if (!s3) throw new Error('Faltan CLOUDFLARE_ACCOUNT_ID y las credenciales de R2 en .env.');
  for (const record of records) await uploadArchive(record);
  console.log(`${records.length} ZIP subidos a R2.`);
}
