import { Check, ChevronLeft, ChevronRight, Download, Filter, Play, X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { GalleryDay, GalleryMedia } from '../data/gallery';

type DownloadFile = { id: string; name: string; url: string };

function formatBlockTime(from?: string, to?: string) {
  if (!from) return 'Parada del itinerario';
  const start = from.slice(11, 16);
  return to ? `${start}–${to.slice(11, 16)}` : start;
}

export default function DayExperience({ day }: { day: GalleryDay }) {
  const allMedia = useMemo(() => day.blocks.flatMap((block) => block.media), [day.blocks]);
  const images = useMemo(() => allMedia.filter((item) => item.mediaType === 'image'), [allMedia]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const visibleBlocks = useMemo(() => {
    if (!activeTag) return day.blocks;
    return day.blocks
      .map((block) => ({ ...block, media: block.media.filter((item) => item.keywords.includes(activeTag)) }))
      .filter((block) => block.media.length);
  }, [activeTag, day.blocks]);
  const visibleMedia = useMemo(() => visibleBlocks.flatMap((block) => block.media), [visibleBlocks]);
  const active = allMedia.find((item) => item.id === activeId);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    allMedia.forEach((item) => item.keywords.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es')).slice(0, 32);
  }, [allMedia]);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`selection:${day.id}`) || '[]') as string[];
      setSelected(new Set(saved.filter((id) => images.some((item) => item.id === id))));
    } catch {}
  }, [day.id, images]);

  useEffect(() => {
    try { sessionStorage.setItem(`selection:${day.id}`, JSON.stringify([...selected])); } catch {}
  }, [day.id, selected]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ((activeId || downloadOpen) && !dialog.open) dialog.showModal();
    const closeOnBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener('click', closeOnBackdrop);
    return () => dialog.removeEventListener('click', closeOnBackdrop);
  }, [activeId, downloadOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!active || downloadOpen) return;
      const index = visibleMedia.findIndex((item) => item.id === active.id);
      if (event.key === 'ArrowLeft' && index > 0) setActiveId(visibleMedia[index - 1].id);
      if (event.key === 'ArrowRight' && index < visibleMedia.length - 1) setActiveId(visibleMedia[index + 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, downloadOpen, visibleMedia]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const openMedia = (item: GalleryMedia, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setDownloadOpen(false);
    setActiveId(item.id);
  };
  const closeDialog = () => dialogRef.current?.close();
  const onClose = () => {
    setActiveId(null);
    setDownloadOpen(false);
    triggerRef.current?.focus();
  };
  const selectedImages = images.filter((item) => selected.has(item.id));
  const currentIndex = active ? visibleMedia.findIndex((item) => item.id === active.id) : -1;

  async function prepareDownload() {
    setPreparing(true);
    setError('');
    setFiles([]);
    try {
      const response = await fetch('/api/download-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ dayId: day.id, photoIds: selectedImages.map((item) => item.id) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se han podido preparar las descargas.');
      setFiles(result.files);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido preparar las descargas.');
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div class="day-experience">
      {tags.length > 0 && (
        <details class="tag-filter">
          <summary><Filter size={15} strokeWidth={1.8} aria-hidden="true" /> Filtrar por etiquetas {activeTag && <span>· {activeTag}</span>}</summary>
          <div class="tag-list">
            {tags.map(({ tag, count }) => (
              <button key={tag} type="button" class={activeTag === tag ? 'is-active' : ''} aria-pressed={activeTag === tag} onClick={() => setActiveTag((current) => current === tag ? null : tag)}>
                {tag}<span>{count}</span>
              </button>
            ))}
            {activeTag && <button type="button" class="tag-reset" onClick={() => setActiveTag(null)}>Quitar filtro</button>}
          </div>
        </details>
      )}

      <ol class="places-stack" aria-label={`Recorrido del día ${day.number}`}>
        {visibleBlocks.map((block, index) => (
          <li class="place-chapter" key={block.id}>
            <span class="place-marker" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <article class="place-section">
              <header class="place-heading">
                <div>
                  <p class="eyebrow">Parada {index + 1} · {formatBlockTime(block.from, block.to)}</p>
                  <h2>{block.title}</h2>
                  <p class="place-summary">{block.summary}</p>
                </div>
                <span class="place-count">{block.media.length ? `${block.media.length} ${block.media.length === 1 ? 'archivo' : 'archivos'}` : 'Sin archivo'}</span>
              </header>

              {block.description.trim() !== block.summary.trim() && (
                <details class="place-note">
                  <summary>Leer nota del lugar</summary>
                  <p>{block.description}</p>
                </details>
              )}

              {block.media.length ? (
                <div class="media-grid">
                  {block.media.map((item) => (
                    <figure class={`media-tile ${item.mediaType === 'video' ? 'media-tile--video' : ''} ${selected.has(item.id) ? 'is-selected' : ''}`} key={item.id}>
                      {item.mediaType === 'image' && (
                        <button type="button" class="media-select" aria-label={`${selected.has(item.id) ? 'Quitar de la selección' : 'Seleccionar'}: ${item.title}`} aria-pressed={selected.has(item.id)} onClick={() => toggle(item.id)}>
                          <Check size={15} strokeWidth={2} aria-hidden="true" />
                        </button>
                      )}
                      <button type="button" class="media-open" onClick={(event) => openMedia(item, event.currentTarget)} aria-label={`${item.mediaType === 'video' ? 'Reproducir' : 'Ampliar'}: ${item.title}`}>
                        {item.mediaType === 'image' ? (
                          <img src={item.thumbnailSrc} width="960" height="720" alt="" loading="lazy" decoding="async" />
                        ) : (
                          <span class="video-placeholder" aria-hidden="true"><Play size={34} strokeWidth={1.5} /></span>
                        )}
                      </button>
                      <figcaption class="sr-only">{item.title}. {item.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p class="place-empty">Esta parada forma parte del itinerario, pero no tiene fotografías asociadas en el archivo del día.</p>
              )}
            </article>
          </li>
        ))}
      </ol>

      {selected.size > 0 && (
        <aside class="selection-bar" aria-label="Fotos seleccionadas">
          <strong>{selected.size} {selected.size === 1 ? 'foto' : 'fotos'}</strong>
          <button class="selection-clear" type="button" onClick={() => setSelected(new Set())}>Deseleccionar</button>
          <button class="button" type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setActiveId(null); setDownloadOpen(true); }}>
            <Download size={17} strokeWidth={1.8} aria-hidden="true" /> Descargar
          </button>
        </aside>
      )}

      <dialog ref={dialogRef} onClose={onClose} aria-labelledby="experience-dialog-title" closedby="any" class={downloadOpen ? 'download-dialog' : 'media-dialog'}>
        <div class="experience-dialog">
          <button type="button" class="dialog-x" onClick={closeDialog} aria-label="Cerrar"><X size={20} strokeWidth={1.7} aria-hidden="true" /></button>

          {active && (
            <div class="lightbox">
              <div class="lightbox-media">
                {active.mediaType === 'image' ? (
                  <img src={active.src} alt={active.caption} />
                ) : (
                  <video key={active.id} controls autoplay preload="metadata" playsinline src={active.src} aria-label={active.title} />
                )}
                <button type="button" class="lightbox-nav lightbox-nav--previous" disabled={currentIndex <= 0} onClick={() => setActiveId(visibleMedia[currentIndex - 1].id)} aria-label="Archivo anterior">
                  <ChevronLeft size={24} aria-hidden="true" />
                </button>
                <button type="button" class="lightbox-nav lightbox-nav--next" disabled={currentIndex >= visibleMedia.length - 1} onClick={() => setActiveId(visibleMedia[currentIndex + 1].id)} aria-label="Archivo siguiente">
                  <ChevronRight size={24} aria-hidden="true" />
                </button>
              </div>
              <aside class="lightbox-copy">
                <p class="eyebrow">{active.mediaType === 'video' ? 'Vídeo' : 'Imagen'} {currentIndex + 1} de {visibleMedia.length}</p>
                <h2 id="experience-dialog-title">{active.title}</h2>
                <p class="lightbox-caption">{active.caption}</p>
                <div class="lightbox-tags">
                  {active.keywords.map((tag) => <button key={tag} type="button" onClick={() => { setActiveTag(tag); closeDialog(); }}>{tag}</button>)}
                </div>
                {active.mediaType === 'image' && (
                  <button type="button" class="lightbox-select" aria-pressed={selected.has(active.id)} onClick={() => toggle(active.id)}>
                    <Check size={16} aria-hidden="true" /> {selected.has(active.id) ? 'Seleccionada' : 'Seleccionar foto'}
                  </button>
                )}
              </aside>
            </div>
          )}

          {downloadOpen && (
            <div class="download-view">
              <p class="eyebrow">Descargas privadas</p>
              <h2 id="experience-dialog-title">Preparar {selected.size} {selected.size === 1 ? 'foto' : 'fotos'}</h2>
              <p>Se generan enlaces temporales para los archivos WebP seleccionados.</p>
              {!files.length && <button class="button" type="button" disabled={preparing} onClick={prepareDownload}>{preparing ? 'Preparando…' : 'Preparar descargas'}</button>}
              <p class="download-error" role="alert">{error}</p>
              {files.length > 0 && <div class="batch-list">{files.map((file) => <a key={file.id} class="button" href={file.url} download={file.name}><Download size={17} aria-hidden="true" />{file.name}</a>)}</div>}
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
