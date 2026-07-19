import { Play } from 'lucide-preact';
import type { GalleryMedia } from '../../data/gallery';

interface Props {
  item: GalleryMedia;
  onOpen: (item: GalleryMedia, trigger: HTMLElement) => void;
}

export default function MediaTile({ item, onOpen }: Props) {
  const mediaDimensions = item.width && item.height
    ? { width: item.width, height: item.height, aspectRatio: `${item.width} / ${item.height}` }
    : item.mediaType === 'image'
      ? { width: 960, height: 720, aspectRatio: '960 / 720' }
      : { width: 16, height: 9, aspectRatio: '16 / 9' };

  return (
    <figure
      class="group relative mb-2.5 min-w-0 break-inside-avoid overflow-clip rounded-plate border border-line/80 bg-[#d7cbb8] shadow-sm transition-[transform,box-shadow] duration-200 ease-editorial hover:-translate-y-px hover:shadow-lift lg:mb-3 motion-reduce:transform-none motion-reduce:transition-none"
      style={{ aspectRatio: mediaDimensions.aspectRatio }}
    >
      <button
        type="button"
        class="block w-full cursor-zoom-in border-0 bg-transparent p-0"
        onClick={(event) => onOpen(item, event.currentTarget)}
        aria-label={`${item.mediaType === 'video' ? 'Reproducir' : 'Ampliar'}: ${item.title}`}
      >
        {item.mediaType === 'image' ? (
          <img class="h-auto w-full object-contain transition-transform duration-[350ms] ease-editorial group-hover:scale-[1.012] motion-reduce:transition-none" src={item.thumbnailSrc} width={mediaDimensions.width} height={mediaDimensions.height} alt="" loading="lazy" decoding="async" />
        ) : (
          <span class="relative block min-h-32 w-full overflow-hidden bg-charcoal bg-[url('/images/textures/pilgrimage-pattern.webp')] bg-[length:24rem] text-cream bg-blend-soft-light" aria-hidden="true">
            <video
              class="block h-auto w-full"
              src={`${item.src}#t=0.1`}
              width={mediaDimensions.width}
              height={mediaDimensions.height}
              preload="metadata"
              muted
              playsInline
              tabindex={-1}
            />
            <span class="absolute inset-0 grid place-items-center bg-charcoal/10">
              <Play class="box-content rounded-full border border-cream/65 bg-charcoal/45 p-3 text-cream shadow-lift backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none" size={34} strokeWidth={1.5} />
            </span>
          </span>
        )}
      </button>
      <figcaption class="sr-only">{item.title}. {item.caption}</figcaption>
    </figure>
  );
}
