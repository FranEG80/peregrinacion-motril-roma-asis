import { Check, ChevronLeft, ChevronRight, Download, Images, X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PhotoAsset, PilgrimageDay, Place } from '../domain/pilgrimage';

type DialogView = { type: 'place'; place: Place } | { type: 'photo'; place: Place; photoIndex: number } | { type: 'download' } | null;
type Batch = { label: string; count: number; estimatedBytes: number; url: string };

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toFixed(bytes > 100_000_000 ? 0 : 1)} MB`;
}

function PhotoFigure({ photo, selected, onToggle, onOpen }: { photo: PhotoAsset; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  const duplicateCaption = !photo.alt || photo.alt === photo.caption;
  return (
    <figure class={`photo-card ${selected ? 'is-selected' : ''}`}>
      <label class="photo-select">
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span><Check aria-hidden="true" size={18} />{selected ? 'Seleccionada' : 'Seleccionar'}</span>
      </label>
      <button type="button" class="photo-open" onClick={onOpen} aria-label={`Ampliar: ${photo.caption}`}>
        <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt || photo.caption} loading="lazy" />
      </button>
      <figcaption aria-hidden={duplicateCaption ? 'true' : undefined}>{photo.caption}</figcaption>
    </figure>
  );
}

export default function DayExperience({ day }: { day: PilgrimageDay }) {
  const allPhotos = useMemo(() => day.places.flatMap((place) => place.photos), [day]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<DialogView>(null);
  const [quality, setQuality] = useState<'webp' | 'original'>('webp');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [downloadError, setDownloadError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(`selection:${day.id}`) || '[]') as string[];
      setSelected(new Set(stored.filter((id) => allPhotos.some((photo) => photo.id === id))));
    } catch {}
  }, [day.id]);

  useEffect(() => {
    try { sessionStorage.setItem(`selection:${day.id}`, JSON.stringify([...selected])); } catch {}
  }, [day.id, selected]);

  useEffect(() => {
    if (view && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [view]);

  useEffect(() => {
    const openFromUrl = () => {
      const slug = new URL(window.location.href).searchParams.get('lugar');
      const place = day.places.find((candidate) => candidate.slug === slug);
      if (place) setView({ type: 'place', place });
      else if (dialogRef.current?.open) dialogRef.current.close();
    };
    openFromUrl();
    window.addEventListener('popstate', openFromUrl);
    return () => window.removeEventListener('popstate', openFromUrl);
  }, [day.places]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectPhotos = (photos: PhotoAsset[]) => setSelected((current) => new Set([...current, ...photos.map((photo) => photo.id)]));
  const clearPhotos = (photos?: PhotoAsset[]) => setSelected((current) => photos ? new Set([...current].filter((id) => !photos.some((photo) => photo.id === id))) : new Set());

  const open = (next: DialogView, trigger?: HTMLElement | null) => {
    if (trigger) triggerRef.current = trigger;
    setBatches([]);
    setDownloadError('');
    setView(next);
  };

  const openPlace = (place: Place, trigger: HTMLElement) => {
    const url = new URL(window.location.href);
    url.searchParams.set('lugar', place.slug);
    history.pushState({ place: place.slug }, '', url);
    open({ type: 'place', place }, trigger);
  };

  const close = () => dialogRef.current?.close();
  const onDialogClose = () => {
    setView(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('lugar')) { url.searchParams.delete('lugar'); history.replaceState({}, '', url); }
    triggerRef.current?.focus();
  };

  const selectedPhotos = allPhotos.filter((photo) => selected.has(photo.id));
  const estimatedBytes = selectedPhotos.reduce((total, photo) => total + (quality === 'webp' ? photo.webpBytes : photo.originalBytes), 0);

  async function prepareDownload() {
    setPreparing(true);
    setDownloadError('');
    setBatches([]);
    try {
      const response = await fetch('/api/download-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ dayId: day.id, photoIds: selectedPhotos.map((photo) => photo.id), quality }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se ha podido preparar la descarga.');
      setBatches(result.batches);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se ha podido preparar la descarga.');
    } finally { setPreparing(false); }
  }

  return (
    <div class="day-experience">
      <ol class="places-stack" aria-label={`Recorrido del día ${day.number}`}>
        {day.places.map((place) => {
          const placeSelected = place.photos.filter((photo) => selected.has(photo.id)).length;
          return (
            <li class="place-chapter" key={place.id}>
              <span class="place-marker" aria-hidden="true">{String(place.sequence).padStart(2, '0')}</span>
              <article id={`lugar-${place.slug}`} class="place-section">
                <header class="place-heading">
                  <div>
                    <p class="eyebrow">Parada {place.sequence}{place.approximateTime ? ` · ${place.approximateTime}` : ''}</p>
                    <h2>{place.name}</h2>
                    <p class="place-summary">{place.summary}</p>
                  </div>
                  <div class="place-heading-meta">
                    <span>{place.photos.length ? `${place.photos.length} ${place.photos.length === 1 ? 'fotografía' : 'fotografías'}` : 'Sin fotografías'}</span>
                    {place.certainty === 'probable' && <span>Identificación probable</span>}
                  </div>
                </header>

                <div class="place-story">
                  <p>{place.description}</p>
                  <button class="place-detail" type="button" onClick={(event) => openPlace(place, event.currentTarget)}>
                    Abrir la ficha <span aria-hidden="true">↗</span>
                  </button>
                </div>

                {place.photos.length ? (
                  <>
                    <div class="place-actions" aria-label={`Selección de fotos de ${place.name}`}>
                      <span>{placeSelected} de {place.photos.length} seleccionadas</span>
                      <button type="button" onClick={() => selectPhotos(place.photos)}>Seleccionar todas</button>
                      <button type="button" onClick={() => clearPhotos(place.photos)}>Deseleccionar</button>
                    </div>
                    <div class="photo-grid">
                      {place.photos.map((photo, index) => <PhotoFigure key={photo.id} photo={photo} selected={selected.has(photo.id)} onToggle={() => toggle(photo.id)} onOpen={() => open({ type: 'photo', place, photoIndex: index })} />)}
                    </div>
                  </>
                ) : (
                  <p class="place-empty">No hay fotografías de esta visita. La parada se conserva en el recorrido por su significado.</p>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      {selected.size > 0 && (
        <aside class="selection-bar" aria-label="Fotos seleccionadas">
          <div><strong>{selected.size} {selected.size === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}</strong><span aria-live="polite">Listas para descargar</span></div>
          <button class="button button--quiet" type="button" onClick={() => clearPhotos()}>Deseleccionar</button>
          <button class="button" type="button" onClick={(event) => open({ type: 'download' }, event.currentTarget)}><Download aria-hidden="true" size={20} />Descargar</button>
        </aside>
      )}

      <dialog ref={dialogRef} onClose={onDialogClose} aria-labelledby="experience-dialog-title" closedby="any">
        {view && (
          <div class="experience-dialog">
            <button type="button" class="dialog-x" onClick={close} aria-label="Cerrar"><X aria-hidden="true" size={25} /></button>
            {view.type === 'place' && (
              <div>
                <p class="eyebrow">Lugar {view.place.sequence}{view.place.approximateTime ? ` · ${view.place.approximateTime}` : ''}</p>
                <h2 id="experience-dialog-title">{view.place.name}</h2>
                <p class="place-description">{view.place.description}</p>
                {view.place.editorialNote && <p class="mt-5 border-l-2 border-[#a2302b] bg-[#eee5d8] px-4 py-3 text-sm leading-6 text-[#554c44]"><strong class="text-[#8e2925]">Nota del itinerario.</strong> {view.place.editorialNote}</p>}
                {view.place.photos.length ? (
                  <div class="dialog-photo-grid">
                    {view.place.photos.map((photo, index) => <button type="button" onClick={() => setView({ type: 'photo', place: view.place, photoIndex: index })} aria-label={`Ampliar: ${photo.caption}`}><img src={photo.src} width={photo.width} height={photo.height} alt="" loading="lazy" /></button>)}
                  </div>
                ) : <p class="mt-5 text-sm font-bold text-[#6a6057]">Esta parada no tiene fotografías.</p>}
              </div>
            )}
            {view.type === 'photo' && (() => {
              const photo = view.place.photos[view.photoIndex];
              return (
                <div class="lightbox">
                  <p class="eyebrow">{view.place.name} · Foto {view.photoIndex + 1} de {view.place.photos.length}</p>
                  <h2 id="experience-dialog-title" class="sr-only">Fotografía ampliada</h2>
                  <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt || photo.caption} />
                  <p class="lightbox-caption">{photo.caption}</p>
                  <div class="lightbox-actions">
                    <button class="button button--secondary" type="button" onClick={() => setView({ type: 'place', place: view.place })}>Volver al lugar</button>
                    <button class="button button--quiet" type="button" disabled={view.photoIndex === 0} onClick={() => setView({ ...view, photoIndex: view.photoIndex - 1 })}><ChevronLeft aria-hidden="true" size={21} />Anterior</button>
                    <button class="button button--quiet" type="button" disabled={view.photoIndex === view.place.photos.length - 1} onClick={() => setView({ ...view, photoIndex: view.photoIndex + 1 })}>Siguiente<ChevronRight aria-hidden="true" size={21} /></button>
                    <label class="lightbox-select"><input type="checkbox" checked={selected.has(photo.id)} onChange={() => toggle(photo.id)} />Seleccionar esta foto</label>
                  </div>
                </div>
              );
            })()}
            {view.type === 'download' && (
              <div class="download-view">
                <p class="eyebrow">Descarga por partes</p>
                <h2 id="experience-dialog-title">Preparar {selected.size} fotos</h2>
                <p>La opción recomendada mantiene la resolución completa y reduce el peso sin conservar datos privados de ubicación.</p>
                <fieldset>
                  <legend>Calidad de descarga</legend>
                  <label class={quality === 'webp' ? 'is-checked' : ''}><input type="radio" name="quality" value="webp" checked={quality === 'webp'} onChange={() => { setQuality('webp'); setBatches([]); }} /><span><strong>WebP de alta calidad</strong><small>Resolución completa · calidad 88 · recomendado</small></span></label>
                  <label class={quality === 'original' ? 'is-checked' : ''}><input type="radio" name="quality" value="original" checked={quality === 'original'} onChange={() => { setQuality('original'); setBatches([]); }} /><span><strong>Archivos originales</strong><small>Más pesados y con los metadatos originales</small></span></label>
                </fieldset>
                <div class="download-summary"><Images aria-hidden="true" size={23} /><span><strong>{selected.size} fotos · {formatBytes(estimatedBytes)}</strong><small>Usa una conexión Wi‑Fi para descargas grandes.</small></span></div>
                {!batches.length && <button class="button" type="button" disabled={preparing} onClick={prepareDownload}>{preparing ? 'Preparando…' : 'Preparar descarga'}</button>}
                <p class="download-error" role="alert" aria-live="polite">{downloadError}</p>
                {batches.length > 0 && <div class="batch-list">{batches.map((batch) => <a class="button" href={batch.url}><Download aria-hidden="true" size={20} />{batch.label} · {batch.count} fotos</a>)}</div>}
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
