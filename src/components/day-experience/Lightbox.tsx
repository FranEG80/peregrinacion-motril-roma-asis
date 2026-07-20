import { animate } from 'motion';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, MapPin, RefreshCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-preact';
import type { CSSProperties, TargetedKeyboardEvent, TargetedPointerEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { GalleryMedia } from '../../data/gallery';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

type HdState = 'thumbnail' | 'loading' | 'loaded' | 'error';
type ImageView = { zoom: number; x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number };

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
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hdImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [hdState, setHdState] = useState<HdState>('thumbnail');
  const [view, setView] = useState<ImageView>({ zoom: MIN_ZOOM, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const { zoom, x, y } = view;

  useEffect(() => {
    if (!mediaRef.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const controls = animate(mediaRef.current, { opacity: [0.55, 1], scale: [0.992, 1] }, { duration: .18, ease: 'easeOut' });
    return () => controls.stop();
  }, [active.id]);

  useEffect(() => {
    dragRef.current = null;
    setIsPanning(false);
    setView({ zoom: MIN_ZOOM, x: 0, y: 0 });
    setHdState('thumbnail');
  }, [active.id]);

  useEffect(() => {
    const video = active.mediaType === 'video' ? videoRef.current : null;
    return () => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [active.id]);

  useEffect(() => () => {
    const pendingImage = hdImageRef.current;
    if (!pendingImage) return;
    pendingImage.onload = null;
    pendingImage.onerror = null;
    hdImageRef.current = null;
  }, [active.id]);

  const imageStyle = {
    '--lightbox-zoom': zoom,
    '--lightbox-pan-x': `${x}px`,
    '--lightbox-pan-y': `${y}px`,
  } as CSSProperties;
  const imageSrc = hdState === 'loaded' ? active.src : active.thumbnailSrc;
  const zoomPercentage = Math.round(zoom * 100);
  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;

  const getPanBounds = (targetZoom: number) => {
    const viewport = mediaRef.current;
    const image = imageRef.current;
    if (!viewport || !image || !image.naturalWidth || !image.naturalHeight) return { maxX: 0, maxY: 0 };

    const fitScale = Math.min(image.clientWidth / image.naturalWidth, image.clientHeight / image.naturalHeight);
    const scaledWidth = image.naturalWidth * fitScale * targetZoom;
    const scaledHeight = image.naturalHeight * fitScale * targetZoom;
    return {
      maxX: Math.max(0, (scaledWidth - viewport.clientWidth) / 2),
      maxY: Math.max(0, (scaledHeight - viewport.clientHeight) / 2),
    };
  };

  const changeZoom = (delta: number) => {
    setView((current) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom + delta));
      const { maxX, maxY } = getPanBounds(nextZoom);
      return {
        zoom: nextZoom,
        x: Math.min(maxX, Math.max(-maxX, current.x)),
        y: Math.min(maxY, Math.max(-maxY, current.y)),
      };
    });
  };

  const resetView = () => {
    dragRef.current = null;
    setIsPanning(false);
    setView({ zoom: MIN_ZOOM, x: 0, y: 0 });
  };

  const startPan = (event: TargetedPointerEvent<HTMLImageElement>) => {
    if (zoom <= MIN_ZOOM || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
    };
    setIsPanning(true);
  };

  const movePan = (event: TargetedPointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setView((current) => {
      const { maxX, maxY } = getPanBounds(current.zoom);
      return {
        ...current,
        x: Math.min(maxX, Math.max(-maxX, drag.originX + event.clientX - drag.startX)),
        y: Math.min(maxY, Math.max(-maxY, drag.originY + event.clientY - drag.startY)),
      };
    });
  };

  const stopPan = (event: TargetedPointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsPanning(false);
  };

  const movePanWithKeyboard = (event: TargetedKeyboardEvent<HTMLImageElement>) => {
    if (zoom <= MIN_ZOOM) return;
    const distance = event.shiftKey ? 80 : 32;
    const movement = {
      ArrowLeft: { x: distance, y: 0 },
      ArrowRight: { x: -distance, y: 0 },
      ArrowUp: { x: 0, y: distance },
      ArrowDown: { x: 0, y: -distance },
    }[event.key];
    if (!movement) return;

    event.preventDefault();
    event.stopPropagation();
    setView((current) => {
      const { maxX, maxY } = getPanBounds(current.zoom);
      return {
        ...current,
        x: Math.min(maxX, Math.max(-maxX, current.x + movement.x)),
        y: Math.min(maxY, Math.max(-maxY, current.y + movement.y)),
      };
    });
  };

  const loadHdImage = () => {
    if (hdState === 'loading' || hdState === 'loaded') return;

    setHdState('loading');
    const image = new Image();
    hdImageRef.current = image;
    image.decoding = 'async';
    image.fetchPriority = 'high';

    const showHdImage = () => {
      if (hdImageRef.current !== image) return;
      hdImageRef.current = null;
      setHdState('loaded');
    };
    image.onload = () => {
      image.decode().then(showHdImage, showHdImage);
    };
    image.onerror = () => {
      if (hdImageRef.current !== image) return;
      hdImageRef.current = null;
      setHdState('error');
    };
    image.src = active.src;
  };

  return (
    <div class="grid min-h-[min(80dvh,780px)] md:h-[min(80dvh,780px)] md:grid-cols-[minmax(0,1.4fr)_minmax(21rem,0.85fr)] md:grid-rows-[minmax(0,1fr)]">
      <div ref={mediaRef} class="relative grid min-h-[46dvh] touch-pan-y place-items-center overflow-hidden bg-charcoal bg-[url('/images/textures/pilgrimage-pattern.webp')] bg-[length:28rem] bg-blend-soft-light select-none md:h-full">
        {active.mediaType === 'image' ? (
          <>
            <img
              ref={imageRef}
              class={`block size-full max-h-[78dvh] origin-center [translate:var(--lightbox-pan-x)_var(--lightbox-pan-y)] scale-[var(--lightbox-zoom)] object-contain select-none ${
                isPanning ? 'transition-none' : 'transition-transform duration-150 motion-reduce:transition-none'
              } ${zoom > MIN_ZOOM ? `touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}` : 'touch-pan-y'}`}
              style={imageStyle}
              src={imageSrc}
              alt={active.caption}
              tabIndex={zoom > MIN_ZOOM ? 0 : -1}
              aria-describedby={zoom > MIN_ZOOM ? 'lightbox-pan-hint' : undefined}
              decoding="async"
              draggable={false}
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={stopPan}
              onPointerCancel={stopPan}
              onLostPointerCapture={() => {
                dragRef.current = null;
                setIsPanning(false);
              }}
              onKeyDown={movePanWithKeyboard}
            />
            {zoom > MIN_ZOOM && (
              <p id="lightbox-pan-hint" class="pointer-events-none absolute bottom-16 left-3 z-10 m-0 rounded-full border border-white/20 bg-charcoal/75 px-3 py-1.5 text-[0.68rem] font-semibold text-white shadow-lift backdrop-blur">
                Arrastra o usa las flechas para mover
              </p>
            )}
            <div class="absolute bottom-3 left-3 z-10 flex items-center rounded-full border border-white/30 bg-charcoal/80 text-white shadow-lift backdrop-blur select-none" role="group" aria-label="Controles de zoom">
              <button
                type="button"
                class="grid size-11 place-items-center rounded-l-full transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-35"
                onClick={() => changeZoom(-ZOOM_STEP)}
                disabled={!canZoomOut}
                aria-label="Alejar imagen"
              >
                <ZoomOut size={19} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <output class="w-12 text-center text-[0.68rem] font-bold tabular-nums" aria-label={`Zoom actual: ${zoomPercentage} %`}>
                {zoomPercentage}%
              </output>
              <button
                type="button"
                class="grid size-11 place-items-center transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-35"
                onClick={() => changeZoom(ZOOM_STEP)}
                disabled={!canZoomIn}
                aria-label="Acercar imagen"
              >
                <ZoomIn size={19} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button
                type="button"
                class="grid size-11 place-items-center rounded-r-full border-l border-white/20 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-35"
                onClick={resetView}
                disabled={!canZoomOut}
                aria-label="Restablecer tamaño de imagen"
              >
                <RotateCcw size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              class={`absolute right-3 bottom-3 z-10 flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-bold shadow-lift backdrop-blur transition-colors select-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal ${
                hdState === 'loaded'
                  ? 'border-gold/60 bg-gold text-charcoal'
                  : 'border-white/30 bg-cream/92 text-charcoal hover:bg-paper'
              } ${hdState === 'loading' ? 'cursor-wait' : ''}`}
              onClick={loadHdImage}
              aria-busy={hdState === 'loading'}
              aria-label={
                hdState === 'loaded'
                  ? 'Imagen cargada en alta resolución'
                  : hdState === 'loading'
                    ? 'Cargando imagen en alta resolución'
                    : hdState === 'error'
                      ? 'Reintentar la carga en alta resolución'
                      : 'Cargar esta imagen en alta resolución'
              }
            >
              {hdState === 'loading' ? (
                <LoaderCircle class="animate-spin motion-reduce:animate-none" size={17} aria-hidden="true" />
              ) : hdState === 'loaded' ? (
                <Check size={17} strokeWidth={2.2} aria-hidden="true" />
              ) : hdState === 'error' ? (
                <RefreshCw size={16} aria-hidden="true" />
              ) : null}
              <span>
                {hdState === 'loading'
                  ? 'Cargando HD'
                  : hdState === 'loaded'
                    ? 'HD activa'
                    : hdState === 'error'
                      ? 'Reintentar HD'
                      : 'Ver en HD'}
              </span>
            </button>
            <span class="sr-only" aria-live="polite" aria-atomic="true">Zoom: {zoomPercentage} %.</span>
            <span class="sr-only" aria-live="polite" aria-atomic="true">
              {hdState === 'loading'
                ? 'Cargando imagen en alta resolución.'
                : hdState === 'loaded'
                  ? 'Imagen en alta resolución cargada.'
                  : hdState === 'error'
                    ? 'No se pudo cargar la imagen en alta resolución.'
                    : ''}
            </span>
          </>
        ) : (
          <video ref={videoRef} class="block size-full max-h-[78dvh] object-contain" key={active.id} controls autoPlay preload="metadata" playsInline src={active.src} aria-label={active.title} />
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
      <aside class="content-center bg-cream bg-[url('/images/textures/paper-fiber.webp')] bg-[length:32rem] p-[clamp(1.5rem,4vw,2.5rem)] md:h-full md:overflow-y-auto">
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
