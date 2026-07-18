import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { GalleryDay, GalleryMedia } from '../../data/gallery';
import Lightbox from './Lightbox';
import PlaceChapter from './PlaceChapter';
import TagFilter from './TagFilter';
import ZipDownloadButton from './ZipDownloadButton';

export default function DayExperience({ day }: { day: GalleryDay }) {
  const allMedia = useMemo(() => day.blocks.flatMap((block) => block.media), [day.blocks]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [placesParent] = useAutoAnimate<HTMLOListElement>({ duration: 190 });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  console.log('allMedia', allMedia.find((item) => item.id === activeId), activeId);

  const visibleBlocks = useMemo(() => {
    if (!activeTag) return day.blocks;
    return day.blocks
      .map((block) => ({ ...block, media: block.media.filter((item) => item.keywords.includes(activeTag)) }))
      .filter((block) => block.media.length);
  }, [activeTag, day.blocks]);
  const visibleMedia = useMemo(() => visibleBlocks.flatMap((block) => block.media), [visibleBlocks]);
  const archiveMedia = useMemo(() => {
    const seen = new Set<string>();
    return allMedia.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [allMedia]);
  const videoCount = archiveMedia.filter((item) => item.mediaType === 'video').length;
  const active = allMedia.find((item) => item.id === activeId);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    allMedia.forEach((item) => item.keywords.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag, 'es'))
      .slice(0, 32);
  }, [allMedia]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeId && !dialog.open) dialog.showModal();
    const closeOnBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener('click', closeOnBackdrop);
    return () => dialog.removeEventListener('click', closeOnBackdrop);
  }, [activeId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!active) return;
      const index = visibleMedia.findIndex((item) => item.id === active.id);
      if (event.key === 'ArrowLeft' && index > 0) setActiveId(visibleMedia[index - 1].id);
      if (event.key === 'ArrowRight' && index < visibleMedia.length - 1) setActiveId(visibleMedia[index + 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, visibleMedia]);

  const openMedia = (item: GalleryMedia, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setActiveId(item.id);
  };
  const closeDialog = () => dialogRef.current?.close();
  const onClose = () => {
    setActiveId(null);
    triggerRef.current?.focus();
  };
  const currentIndex = active ? visibleMedia.findIndex((item) => item.id === active.id) : -1;
  const originalBlock = (id: string) => day.blocks.find((item) => item.id === id);

  return (
    <div class="mt-[clamp(2.5rem,6vw,4rem)]">
      <div class="mb-[clamp(3rem,7vw,5rem)] grid items-start gap-5 border-y border-line py-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <TagFilter tags={tags} activeTag={activeTag} onChange={setActiveTag} />
        <div class="grid justify-items-start gap-1 md:justify-items-end md:text-right">
          <ZipDownloadButton
            href={day.archiveUrl}
            label={`Descargar el día completo (${archiveMedia.length} archivos)`}
            fileCount={archiveMedia.length}
            sizeBytes={day.archiveSizeBytes}
            className="md:justify-items-end"
          />
          <p class="m-0 max-w-[46ch] text-[0.68rem] text-muted">
            {videoCount ? `Incluye ${videoCount} ${videoCount === 1 ? 'vídeo' : 'vídeos'}; la descarga puede ocupar bastante.` : 'Los archivos se descargan en su calidad almacenada.'}
          </p>
        </div>
      </div>

      <ol ref={placesParent} class="relative m-0 grid list-none p-0 before:absolute before:top-4 before:bottom-0 before:left-[1.04rem] before:w-px before:bg-[linear-gradient(var(--color-gold),var(--color-line)_88%,transparent)] before:content-[''] md:before:left-[1.29rem]" aria-label={`Recorrido del día ${day.number}`}>
        {visibleBlocks.map((block, index) => (
          <PlaceChapter
            key={block.id}
            block={block}
            original={originalBlock(block.id)}
            index={index}
            onOpen={openMedia}
          />
        ))}
      </ol>

      <dialog
        ref={dialogRef}
        onClose={onClose}
        aria-labelledby="experience-dialog-title"
        closedby="any"
        class="w-[min(1160px,calc(100%-1.25rem))] max-h-[92dvh] overflow-auto"
      >
        <div class="relative min-h-full">
          <button type="button" class="absolute top-3 right-3 z-20 grid size-11 place-items-center rounded-full border-0 bg-cream/92 text-charcoal shadow-lift backdrop-blur hover:bg-paper" onClick={closeDialog} aria-label="Cerrar">
            <X size={20} strokeWidth={1.7} aria-hidden="true" />
          </button>
          {active && (
            <Lightbox
              key={active.id}
              active={active}
              currentIndex={currentIndex}
              total={visibleMedia.length}
              onPrevious={() => setActiveId(visibleMedia[currentIndex - 1].id)}
              onNext={() => setActiveId(visibleMedia[currentIndex + 1].id)}
              onTag={(tag) => {
                setActiveTag(tag);
                closeDialog();
              }}
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
