import { describe, expect, it } from 'vitest';
import { buildGalleryDay } from './gallery';

describe('buildGalleryDay', () => {
  it('uses separate 1080p playback, 4K and WebP poster URLs for videos', () => {
    const day = buildGalleryDay('primer-dia-en-roma', {
      version: 1,
      generatedAt: '2026-07-07T00:00:00.000Z',
      items: [{
        id: 'test-video',
        key: '07julio2026/IMG_20260707_115410.mp4',
        mediaType: 'video',
        capturedAt: '2026-07-07T07:50:00.000Z',
        title: 'Vídeo de prueba',
        caption: 'Una portada de prueba.',
        keywords: [],
        width: 1080,
        height: 1920,
      }],
    }, (key) => `/${key}`);

    const video = day?.blocks.flatMap((block) => block.media).find((item) => item.id === 'test-video');
    expect(video?.src).toBe('/playback/1080/07julio2026/IMG_20260707_115410.mp4');
    expect(video?.video4kSrc).toBe('/07julio2026/IMG_20260707_115410.mp4?v=avc-4k-1');
    expect(video?.thumbnailSrc).toBe('/thumbnail/07julio2026/IMG_20260707_115410.webp');
  });
});
