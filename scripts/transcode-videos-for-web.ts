import { spawn, execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { promisify } from 'node:util';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

type ManifestItem = {
  key: string;
  mediaType: 'image' | 'video';
};

type Manifest = {
  version: 1;
  items: ManifestItem[];
};

type Variant = {
  name: '1080' | '4k';
  maxLongEdge: 1920 | 3840;
  preset: 'fast' | 'veryfast';
  crf: '21';
};

type Probe = {
  streams?: Array<{
    codec_name?: string;
    profile?: string;
    pix_fmt?: string;
    width?: number;
    height?: number;
    color_space?: string;
    color_transfer?: string;
    color_primaries?: string;
  }>;
  format?: { duration?: string; size?: string };
};

type UploadRecord = {
  key: string;
  path: string;
  quality: Variant['name'];
};

const variants: Variant[] = [
  { name: '1080', maxLongEdge: 1920, preset: 'fast', crf: '21' },
  { name: '4k', maxLongEdge: 3840, preset: 'veryfast', crf: '21' },
];

const root = resolve(import.meta.dirname, '..');
const dataDirectory = resolve(root, 'data');
const backupDirectory = resolve(dataDirectory, '.hevc-backup');
const tempDirectory = resolve(dataDirectory, '.transcode-temp');
const args = process.argv.slice(2);
const upload = args.includes('--upload');
const force = args.includes('--force');
const bucketArgument = args.find((argument) => argument.startsWith('--bucket='));
const bucket = bucketArgument?.slice('--bucket='.length) || 'peregrinacion-motril-roma-2026';
const execFileAsync = promisify(execFile);

function checkedPath(base: string, key: string) {
  const path = resolve(base, key);
  if (!path.startsWith(`${base}/`)) throw new Error(`Ruta de vídeo no válida: ${key}`);
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

async function probe(path: string) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,color_space,color_transfer,color_primaries:format=duration,size',
    '-of', 'json',
    path,
  ]);
  return JSON.parse(stdout) as Probe;
}

function assertCompatibleVideo(result: Probe, variant: Variant, key: string) {
  const stream = result.streams?.[0];
  const duration = Number(result.format?.duration);
  const size = Number(result.format?.size);
  if (
    stream?.codec_name !== 'h264'
    || stream.pix_fmt !== 'yuv420p'
    || !stream.width
    || !stream.height
    || Math.max(stream.width, stream.height) > variant.maxLongEdge
    || stream.color_space !== 'bt709'
    || stream.color_transfer !== 'bt709'
    || stream.color_primaries !== 'bt709'
    || !Number.isFinite(duration)
    || duration <= 0
    || !Number.isFinite(size)
    || size <= 0
  ) {
    throw new Error(`${key} no supera la validación ${variant.name}: ${JSON.stringify(result)}`);
  }
}

async function runFfmpeg(input: string, output: string, variant: Variant) {
  await mkdir(dirname(output), { recursive: true });
  await unlink(output).catch(() => undefined);
  const longEdge = String(variant.maxLongEdge);
  const filter = [
    `scale='if(gt(iw,ih),${longEdge},-2)':'if(gt(iw,ih),-2,${longEdge})':flags=lanczos`,
    'format=yuv420p',
    'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
  ].join(',');

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-stats',
      '-stats_period', '10',
      '-y',
      '-i', input,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-map_metadata', '-1',
      '-sn',
      '-dn',
      '-vf', filter,
      '-c:v', 'libx264',
      '-preset', variant.preset,
      '-crf', variant.crf,
      '-profile:v', 'high',
      '-g', '60',
      '-keyint_min', '60',
      '-sc_threshold', '0',
      '-tag:v', 'avc1',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      output,
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    child.once('error', rejectPromise);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`ffmpeg terminó con código ${code ?? 'desconocido'}.`));
    });
  });
}

async function ensureVariant(item: ManifestItem, variant: Variant) {
  const originalPath = checkedPath(dataDirectory, item.key);
  const backupPath = checkedPath(backupDirectory, item.key);
  const inputPath = await exists(backupPath) ? backupPath : originalPath;

  if (variant.name === '1080') {
    const outputPath = checkedPath(resolve(dataDirectory, 'playback/1080'), item.key);
    if (!force && await exists(outputPath)) {
      assertCompatibleVideo(await probe(outputPath), variant, item.key);
      return outputPath;
    }
    console.log(`[1080] Convirtiendo ${item.key}`);
    await runFfmpeg(inputPath, outputPath, variant);
    assertCompatibleVideo(await probe(outputPath), variant, item.key);
    return outputPath;
  }

  if (!force && (await probe(originalPath)).streams?.[0]?.codec_name === 'h264') {
    assertCompatibleVideo(await probe(originalPath), variant, item.key);
    return originalPath;
  }

  const outputPath = checkedPath(tempDirectory, item.key);
  console.log(`[4K] Convirtiendo ${item.key}`);
  await runFfmpeg(inputPath, outputPath, variant);
  assertCompatibleVideo(await probe(outputPath), variant, item.key);

  if (!await exists(backupPath)) {
    await mkdir(dirname(backupPath), { recursive: true });
    await rename(originalPath, backupPath);
  }
  await rename(outputPath, originalPath);
  return originalPath;
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

async function uploadVideo(record: UploadRecord) {
  if (!s3) throw new Error('Faltan CLOUDFLARE_ACCOUNT_ID y las credenciales de R2 en .env.');
  const file = await stat(record.path);
  try {
    const remote = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: record.key }));
    if (
      remote.ContentLength === file.size
      && remote.Metadata?.['video-codec'] === 'h264'
      && remote.Metadata?.['video-quality'] === record.quality
    ) {
      return false;
    }
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw error;
  }

  console.log(`[R2] Subiendo ${record.key}`);
  await new Upload({
    client: s3,
    leavePartsOnError: false,
    params: {
      Bucket: bucket,
      Key: record.key,
      Body: createReadStream(record.path),
      ContentLength: file.size,
      ContentType: 'video/mp4',
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        'video-codec': 'h264',
        'video-quality': record.quality,
      },
    },
  }).done();
  return true;
}

const manifest = JSON.parse(await readFile(resolve(dataDirectory, 'gallery-manifest.json'), 'utf8')) as Manifest;
const videos = manifest.items.filter((item) => item.mediaType === 'video');
const records: UploadRecord[] = [];

for (const video of videos) {
  for (const variant of variants) {
    const path = await ensureVariant(video, variant);
    records.push({
      key: variant.name === '1080' ? `playback/1080/${video.key}` : video.key,
      path,
      quality: variant.name,
    });
  }
}

let uploaded = 0;
if (upload) {
  for (const record of records) {
    if (await uploadVideo(record)) uploaded += 1;
  }
}

console.log(`${videos.length} vídeos preparados en 1080p y 4K H.264; ${upload ? `${uploaded} objetos subidos a R2` : 'sin subida a R2'}.`);
