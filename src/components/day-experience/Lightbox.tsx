import { animate } from 'motion';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import type { GalleryMedia } from '../../data/gallery';

interface Props {
  active: GalleryMedia;
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onTag: (tag: string) => void;
}

export default function Lightbox({ active, currentIndex, total, onPrevious, onNext, onTag }: Props) {
  const mediaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mediaRef.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const controls = animate(mediaRef.current, { opacity: [0.55, 1], scale: [0.992, 1] }, { duration: .18, ease: 'easeOut' });
    return () => controls.stop();
  }, [active.id]);

  return (
    <div class="grid min-h-[min(80dvh,780px)] md:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.65fr)]">
      <div ref={mediaRef} class="relative grid min-h-[46dvh] place-items-center overflow-hidden bg-charcoal bg-[url('/images/textures/pilgrimage-pattern.webp')] bg-[length:28rem] bg-blend-soft-light">
        {active.mediaType === 'image' ? (
          <img class="block size-full max-h-[78dvh] object-contain" src={active.src} alt={active.caption} />
        ) : (
          <video class="block size-full max-h-[78dvh] object-contain" key={active.id} controls autoPlay preload="metadata" playsInline src={active.src} aria-label={active.title} />
        )}
        <button
          type="button"
          class="absolute top-1/2 left-3 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-charcoal/70 text-white backdrop-blur disabled:opacity-25"
          disabled={currentIndex <= 0}
          onClick={onPrevious}
          aria-label="Archivo anterior"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <button
          type="button"
          class="absolute top-1/2 right-3 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-charcoal/70 text-white backdrop-blur disabled:opacity-25"
          disabled={currentIndex >= total - 1}
          onClick={onNext}
          aria-label="Archivo siguiente"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>
      <aside class="content-center bg-cream bg-[url('/images/textures/paper-fiber.webp')] bg-[length:32rem] p-[clamp(1.5rem,4vw,2.5rem)]">
        <p class="mb-3 text-[0.68rem] font-extrabold tracking-[0.17em] text-gold uppercase">{active.mediaType === 'video' ? 'Vídeo' : 'Imagen'} {currentIndex + 1} de {total}</p>
        <h2 id="experience-dialog-title" class="max-w-[15ch] pr-8 font-serif text-title-sm leading-[1.04] font-medium tracking-[-0.03em] text-charcoal">{active.title}</h2>
        <p class="mt-4 font-serif text-base leading-7 text-muted">{active.caption}</p>
        {active.locationLabel && (
          <p class="mt-3 flex items-center gap-2 text-xs font-medium text-gold"><MapPin size={14} strokeWidth={1.8} aria-hidden="true" />{active.locationLabel}</p>
        )}
        <div class="my-5 flex flex-wrap gap-2">
          {active.keywords.map((tag) => (
            <button key={tag} type="button" class="rounded-full border border-line bg-cream px-3 py-1.5 text-[0.72rem] font-normal text-muted hover:border-gold hover:text-charcoal" onClick={() => onTag(tag)}>{tag}</button>
          ))}
        </div>
      </aside>
    </div>
  );
}
