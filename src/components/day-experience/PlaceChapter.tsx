import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { memo } from 'preact/compat';
import type { GalleryBlock, GalleryMedia } from '../../data/gallery';
import MediaTile from './MediaTile';
import ZipDownloadButton from './ZipDownloadButton';
import { useColumnCount } from './useColumnCount';

interface Props {
  block: GalleryBlock;
  original?: GalleryBlock;
  index: number;
  onOpen: (item: GalleryMedia, trigger: HTMLElement) => void;
}

function formatBlockTime(from?: string, to?: string) {
  if (!from) return 'Parada del itinerario';
  const start = from.slice(11, 16);
  return to ? `${start}–${to.slice(11, 16)}` : start;
}

function PlaceChapter({ block, original, index, onOpen }: Props) {
  const [col0] = useAutoAnimate<HTMLDivElement>({ duration: 180 });
  const [col1] = useAutoAnimate<HTMLDivElement>({ duration: 180 });
  const [col2] = useAutoAnimate<HTMLDivElement>({ duration: 180 });
  const columnRefs = [col0, col1, col2];
  const fileCount = original?.media.length || 0;
  const columnCount = useColumnCount(2, [{ minWidth: 1024, count: 3 }]);

  const columns: GalleryMedia[][] = Array.from({ length: columnCount }, () => []);
  block.media.forEach((item, i) => columns[i % columnCount].push(item));

  return (
    <li class="relative grid grid-cols-[2.1rem_minmax(0,1fr)] gap-3 pb-[clamp(4rem,9vw,7rem)] md:grid-cols-[2.6rem_minmax(0,1fr)] md:gap-6">
      <span class="sticky top-32 z-10 grid size-[2.1rem] place-items-center self-start rounded-full border border-gold bg-paper font-serif text-[0.68rem] text-gold shadow-[0_0_0_6px_var(--color-paper)] md:size-[2.6rem] md:text-xs" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <article class="min-w-0 border-t border-line pt-6">
        <header class="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p class="mb-3 text-[0.65rem] font-extrabold tracking-[0.16em] text-gold uppercase">Parada {index + 1} · {formatBlockTime(block.from, block.to)}</p>
            <h2 class="max-w-[19ch] font-serif text-title-sm leading-[1.04] font-medium tracking-[-0.03em] text-charcoal">{block.title}</h2>
            <p class="mt-3 max-w-[62ch] font-serif text-[clamp(1rem,1rem+0.2vw,1.14rem)] leading-7 text-muted">{block.summary}</p>
          </div>
          <div class="grid justify-items-start gap-2 md:justify-items-end">
            <span class="rounded-full border border-line px-2.5 py-1 text-[0.62rem] font-medium tracking-[0.06em] text-muted uppercase">
              {fileCount ? `${fileCount} ${fileCount === 1 ? 'archivo' : 'archivos'}` : 'Sin archivo'}
            </span>
            {fileCount > 0 && original?.archiveUrl && (
              <ZipDownloadButton
                href={original.archiveUrl}
                label="Descargar parada"
                fileCount={fileCount}
                sizeBytes={original.archiveSizeBytes}
                className="md:justify-items-end"
              />
            )}
          </div>
        </header>

        {block.description.trim() !== block.summary.trim() && (
          <p class="my-5 max-w-[70ch] border-l border-gold/70 pl-4 text-[0.94rem] leading-7 text-muted">
            {block.description}
          </p>
        )}

        {block.media.length ? (
          <div class="mt-6 flex max-w-[1120px] gap-2.5 lg:gap-3">
            {columns.map((columnItems, columnIndex) => (
              <div key={columnIndex} ref={columnRefs[columnIndex]} class="flex min-w-0 flex-1 flex-col gap-2.5 lg:gap-3">
                {columnItems.map((item) => (
                  <MediaTile key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p class="mt-6 border-y border-line py-4 text-sm text-muted">Esta parada forma parte del itinerario, pero no tiene fotografías asociadas en el archivo del día.</p>
        )}
      </article>
    </li>
  );
}

export default memo(PlaceChapter);
