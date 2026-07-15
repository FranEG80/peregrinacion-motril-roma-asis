import { z } from 'zod';
import { getDay, pilgrimage } from './pilgrimage';

const allowedDays = new Set(['07julio2026', '08julio2026', '09julio2026', '10julio2026', '11julio2026']);

const manifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  items: z.array(z.object({
    id: z.string().min(1), key: z.string().min(1), mediaType: z.enum(['image', 'video']),
    capturedAt: z.string(), title: z.string().min(1), caption: z.string().min(1), keywords: z.array(z.string()),
  })),
});

export type GalleryMedia = z.infer<typeof manifestSchema>['items'][number] & { src: string; thumbnailSrc: string };
export type GalleryBlock = { id: string; title: string; summary: string; description: string; from?: string; to?: string; media: GalleryMedia[] };
export type GalleryDay = { id: string; number: number; slug: string; date: string; city: string; title: string; summary: string; cover: string; blocks: GalleryBlock[] };
export type HomeDayPreview = Pick<GalleryDay, 'id' | 'number' | 'slug' | 'date' | 'city' | 'title' | 'summary'> & { images: [string, string]; highlights: string[] };

type BlockDefinition = Omit<GalleryBlock, 'id' | 'media' | 'description'> & { placeId?: string; description?: string; includeMedia?: boolean };
type EditorialDefinition = Pick<GalleryDay, 'title' | 'summary'> & { prefix: string; coverKey: string; previewKeys: [string, string]; highlights: string[]; blocks: BlockDefinition[] };

const editorial: Record<string, EditorialDefinition> = {
  'day-1': { prefix: '07julio2026', coverKey: '07julio2026/IMG_20260707_100647.webp', previewKeys: ['07julio2026/IMG_20260707_100647.webp', '07julio2026/IMG_20260707_155216.webp'], highlights: ['San Juan de Letrán', 'Panteón de Agripa', 'Fontana di Trevi'], title: 'Llegada a Roma y San Juan de Letrán', summary: 'Llegada por Civitavecchia, visita al conjunto de San Juan de Letrán y recorrido por las plazas, fuentes y monumentos del centro de Roma.', blocks: [
    { placeId: 'llegada-roma', title: 'Llegada por Civitavecchia', summary: 'Las primeras imágenes del viaje, con la costa y las ruinas junto al puerto.', from: '2026-07-07T07:45:00', to: '2026-07-07T08:01:00' },
    { title: 'Plaza de Letrán', summary: 'El baptisterio, el obelisco y la fachada de la catedral de Roma.', description: 'La llegada al conjunto lateranense descubre el obelisco de la plaza, el Baptisterio y la fachada monumental de San Juan de Letrán.', from: '2026-07-07T09:45:00', to: '2026-07-07T10:20:00' },
    { placeId: 'san-juan-letran', title: 'Archibasílica de San Juan de Letrán', summary: 'La nave, las capillas, los monumentos papales y el gran techo dorado.', from: '2026-07-07T10:40:00', to: '2026-07-07T11:40:00' },
    { placeId: 'baptisterio-lateranense', title: 'Baptisterio y Palacio de Letrán', summary: 'La fuente bautismal, las capillas y la cúpula octogonal del antiguo baptisterio.', from: '2026-07-07T11:40:00', to: '2026-07-07T12:06:00' },
    { placeId: 'san-clemente', title: 'Basílica de San Clemente', summary: 'Patio, capillas y mosaicos de una iglesia construida sobre siglos de historia.', from: '2026-07-07T12:10:00', to: '2026-07-07T12:25:00' },
    { title: 'Circo Máximo', summary: 'Una breve mirada a las ruinas del gran recinto de carreras de la Roma antigua.', description: 'El recorrido continúa junto al Circo Máximo, del que se conservan la gran extensión del valle, ruinas y estructuras medievales.', from: '2026-07-07T13:50:00', to: '2026-07-07T14:00:00' },
    { placeId: 'piazza-navona', title: 'Piazza Navona', summary: 'Las fuentes de Neptuno y de los Cuatro Ríos en el gran escenario barroco.', from: '2026-07-07T14:05:00', to: '2026-07-07T15:07:00' },
    { title: 'San Luis de los Franceses', summary: 'La fachada de la iglesia nacional francesa en Roma.', description: 'A pocos pasos de Piazza Navona, la ruta pasa por San Luis de los Franceses antes de alcanzar el Panteón.', from: '2026-07-07T15:07:00', to: '2026-07-07T15:10:00' },
    { placeId: 'panteon', title: 'Panteón de Agripa', summary: 'Fachada, pórtico e interior del templo romano convertido en iglesia.', from: '2026-07-07T15:10:00', to: '2026-07-07T15:21:00' },
    { placeId: 'piazza-montecitorio', title: 'Piazza di Montecitorio', summary: 'El obelisco y el palacio del Parlamento italiano.', from: '2026-07-07T15:21:00', to: '2026-07-07T15:24:00' },
    { placeId: 'piazza-colonna', title: 'Piazza Colonna', summary: 'La columna de Marco Aurelio en el corazón político de Roma.', from: '2026-07-07T15:24:00', to: '2026-07-07T15:30:00' },
    { placeId: 'galleria-alberto-sordi', title: 'Galleria Alberto Sordi', summary: 'El elegante pasaje cubierto de comienzos del siglo XX.', from: '2026-07-07T15:30:00', to: '2026-07-07T15:39:00' },
    { placeId: 'fontana-trevi', title: 'Fontana di Trevi', summary: 'Esculturas, agua y multitud ante la fuente más célebre de Roma.', from: '2026-07-07T15:39:00', to: '2026-07-07T16:01:00' },
    { title: 'Plaza de España', summary: 'La escalinata, el obelisco y Trinità dei Monti.', description: 'La ruta asciende visualmente por la escalinata de Plaza de España hasta la iglesia de la Santísima Trinidad de los Montes.', from: '2026-07-07T16:30:00', to: '2026-07-07T16:40:00' },
    { title: 'Piazza del Popolo', summary: 'La plaza, sus fuentes y la histórica Porta del Popolo.', description: 'El paseo concluye en Piazza del Popolo, junto a sus fuentes, las iglesias gemelas y la antigua puerta de entrada a Roma.', from: '2026-07-07T17:00:00', to: '2026-07-07T17:10:00' },
  ] },
  'day-2': { prefix: '08julio2026', coverKey: '08julio2026/IMG_20260708_072336.webp', previewKeys: ['08julio2026/IMG_20260708_072336.webp', '08julio2026/IMG_20260708_083606.webp'], highlights: ['Plaza y Basílica de San Pedro', 'Celebración junto a san Pedro', 'Museos Vaticanos'], title: 'El Vaticano', summary: 'Una jornada completa en el Vaticano: Plaza y Basílica de San Pedro, celebración, Museos Vaticanos y grutas papales.', blocks: [
    { title: 'Plaza de San Pedro', summary: 'La columnata, la fachada y la llegada al corazón del Vaticano.', description: 'La mañana comienza en la gran plaza diseñada por Bernini, antes de cruzar la Puerta Santa y entrar en la basílica.', from: '2026-07-08T07:20:00', to: '2026-07-08T07:47:00' },
    { placeId: 'vaticano-san-pedro', title: 'Basílica de San Pedro', summary: 'La Piedad, el baldaquino, la cúpula, la Cátedra y las grandes esculturas de la basílica.', from: '2026-07-08T07:47:00', to: '2026-07-08T08:05:00' },
    { title: 'Celebración junto a la tumba de San Pedro', summary: 'La eucaristía del grupo en una capilla vaticana.', description: 'La peregrinación vive su celebración en el interior de San Pedro, junto al lugar que custodia la memoria del apóstol.', from: '2026-07-08T08:05:00', to: '2026-07-08T08:39:00' },
    { placeId: 'vaticano-san-pedro', title: 'Arte y memoria en San Pedro', summary: 'Altares, reliquias, monumentos funerarios y una segunda mirada a la basílica.', from: '2026-07-08T08:39:00', to: '2026-07-08T10:36:00' },
    { placeId: 'museos-vaticanos', title: 'Museos Vaticanos', summary: 'Escultura clásica, mosaicos, tapices y las galerías del gran museo pontificio.', from: '2026-07-08T11:20:00', to: '2026-07-08T13:10:00' },
    { title: 'Vía de la Conciliación', summary: 'Una vista de San Pedro desde la gran avenida de acceso.', description: 'La perspectiva de la Vía de la Conciliación ofrece una última vista urbana de la cúpula y la fachada de San Pedro.', from: '2026-07-08T15:25:00', to: '2026-07-08T15:40:00' },
    { placeId: 'grutas-vaticanas', title: 'Grutas Vaticanas y tumbas papales', summary: 'Los sepulcros de los pontífices y la memoria del apóstol Pedro.', from: '2026-07-08T16:35:00', to: '2026-07-08T16:50:00' },
  ] },
  'day-3': { prefix: '09julio2026', coverKey: '09julio2026/IMG_20260709_074511.webp', previewKeys: ['09julio2026/IMG_20260709_074511.webp', '09julio2026/IMG_20260709_111532.webp'], highlights: ['Santa María la Mayor', 'Coliseo y Foros Imperiales', 'San Pablo Extramuros'], title: 'Santa María la Mayor, San Pablo y catacumbas', summary: 'Santa María la Mayor y otras basílicas, la Roma imperial, San Pablo Extramuros y la visita sin fotografías a las catacumbas.', blocks: [
    { placeId: 'santa-maria-mayor', title: 'Basílica de Santa María la Mayor', summary: 'La celebración, los mosaicos, la Santa Cuna y la memoria de los pontífices.', from: '2026-07-09T07:40:00', to: '2026-07-09T09:50:00' },
    { placeId: 'san-alfonso-perpetuo-socorro', title: 'Santuario del Perpetuo Socorro', summary: 'El icono mariano y la iglesia de San Alfonso.', from: '2026-07-09T09:50:00', to: '2026-07-09T10:06:00' },
    { placeId: 'santa-prassede', title: 'Basílica de Santa Práxedes', summary: 'Mosaicos bizantinos, capillas y la columna de la Flagelación.', from: '2026-07-09T10:06:00', to: '2026-07-09T10:21:00' },
    { placeId: 'san-pietro-in-vincoli', title: 'San Pietro in Vincoli', summary: 'Las cadenas de San Pedro y el Moisés de Miguel Ángel.', from: '2026-07-09T10:40:00', to: '2026-07-09T10:56:00' },
    { placeId: 'coliseo', title: 'Coliseo y Arco de Constantino', summary: 'El anfiteatro, el arco triunfal y la entrada a la Roma imperial.', from: '2026-07-09T11:05:00', to: '2026-07-09T11:37:00' },
    { placeId: 'foros-imperiales', title: 'Foros Imperiales y Vittoriano', summary: 'Majencio, Nerva, Trajano y el gran monumento a Víctor Manuel II.', from: '2026-07-09T11:37:00', to: '2026-07-09T12:20:00' },
    { title: 'Campidoglio y Foro Boario', summary: 'Del Campidoglio al Teatro de Marcelo y los templos del Foro Boario.', description: 'La tarde atraviesa el Campidoglio, el Teatro de Marcelo, Santa María in Cosmedin y los templos antiguos del Foro Boario.', from: '2026-07-09T14:20:00', to: '2026-07-09T14:55:00' },
    { placeId: 'san-pablo-extramuros', title: 'Basílica de San Pablo Extramuros', summary: 'El pórtico, la nave, los mosaicos y la memoria del apóstol Pablo.', from: '2026-07-09T14:55:00', to: '2026-07-09T15:35:00' },
    { placeId: 'catacumbas-san-calixto', title: 'Catacumbas de San Calixto', summary: 'La visita a las catacumbas se conserva en el itinerario aunque no tenga fotografías.', description: 'Las catacumbas de San Calixto forman parte de esta jornada, pero durante la visita no se realizaron fotografías.', includeMedia: false },
  ] },
  'day-4': { prefix: '10julio2026', coverKey: '10julio2026/IMG_20260710_153627.webp', previewKeys: ['10julio2026/IMG_20260710_153627.webp', '10julio2026/IMG_20260710_123243.webp'], highlights: ['Santa Clara y san Carlo Acutis', 'San Francisco de Asís', 'Porciúncula'], title: 'Llegada a Asís y san Carlo Acutis', summary: 'Llegada a Asís, Santa Clara, la Catedral de San Rufino, la memoria de san Carlo Acutis, San Francisco y la Porciúncula.', blocks: [
    { title: 'Llegada a Asís', summary: 'La ciudad medieval sobre la colina y la primera vista de Santa María de los Ángeles.', description: 'El perfil de Asís aparece sobre la colina antes de comenzar el ascenso hacia su centro histórico.', from: '2026-07-10T09:15:00', to: '2026-07-10T10:30:00' },
    { placeId: 'santa-clara-asis', title: 'Basílica de Santa Clara', summary: 'La llegada por sus calles y la celebración junto a Santa Clara.', from: '2026-07-10T10:30:00', to: '2026-07-10T11:40:00' },
    { placeId: 'piazza-comune-minerva', title: 'Piazza del Comune', summary: 'La plaza medieval, su fuente y el corazón cívico de Asís.', from: '2026-07-10T12:00:00', to: '2026-07-10T12:19:00' },
    { placeId: 'torre-popolo', title: 'Torre del Popolo', summary: 'El gran hito medieval de la Piazza del Comune.', includeMedia: false },
    { placeId: 'catedral-san-rufino', title: 'Catedral de San Rufino', summary: 'La pila bautismal, las capillas y el interior de la catedral.', from: '2026-07-10T12:19:00', to: '2026-07-10T12:30:00' },
    { title: 'Altar y reliquia de san Carlo Acutis', summary: 'El retrato, el altar y la reliquia del corazón de san Carlo Acutis.', description: 'La visita recuerda a san Carlo Acutis a través de su retrato, el altar dedicado al joven santo y la reliquia de su corazón conservada en Asís.', from: '2026-07-10T12:30:00', to: '2026-07-10T12:41:00' },
    { placeId: 'piazza-comune-minerva', title: 'Templo de Minerva', summary: 'El templo romano transformado en iglesia barroca.', from: '2026-07-10T12:41:00', to: '2026-07-10T13:01:00' },
    { placeId: 'santuario-spogliazione', title: 'Santuario de la Spogliazione', summary: 'La memoria de Francisco, la casa paterna y el pequeño oratorio.', from: '2026-07-10T14:30:00', to: '2026-07-10T14:44:00' },
    { placeId: 'calles-asis', title: 'Las calles de Asís', summary: 'Callejones, arcos de piedra y vistas abiertas al valle de Umbría.', from: '2026-07-10T14:44:00', to: '2026-07-10T15:30:00' },
    { placeId: 'basilica-san-francisco', title: 'Basílica de San Francisco', summary: 'La llegada a la basílica, sus plazas, claustros y paisajes.', from: '2026-07-10T15:30:00', to: '2026-07-10T17:10:00' },
    { placeId: 'santa-maria-angeles', title: 'Santa María de los Ángeles y la Porciúncula', summary: 'La gran basílica del valle y los lugares vinculados a San Francisco.', from: '2026-07-10T17:10:00', to: '2026-07-10T18:30:00' },
    { title: 'Asís de noche', summary: 'Plazas, concierto, callejones y la basílica iluminada.', description: 'La jornada termina con un paseo nocturno por la ciudad medieval, desde la Piazza del Comune hasta San Francisco.', from: '2026-07-10T22:00:00', to: '2026-07-11T02:01:00' },
  ] },
  'day-5': { prefix: '11julio2026', coverKey: '11julio2026/IMG_20260711_085723.webp', previewKeys: ['11julio2026/IMG_20260711_085723.webp', '11julio2026/IMG_20260711_113035.webp'], highlights: ['Santuario de Rivotorto', 'Último paseo por Asís', 'Regreso a casa'], title: 'Misa en Rivotorto, tiempo libre y regreso', summary: 'Eucaristía en Rivotorto, tiempo libre para el último paseo por Asís y vuelta a España.', blocks: [
    { placeId: 'santuario-rivotorto', title: 'Santuario de Rivotorto', summary: 'El tugurio franciscano, sus estancias y la eucaristía de la mañana.', from: '2026-07-11T08:20:00', to: '2026-07-11T09:20:00' },
    { placeId: 'ultimo-paseo-asis', title: 'Último paseo por Asís', summary: 'La fuente, las plazas y los últimos callejones medievales.', from: '2026-07-11T10:15:00', to: '2026-07-11T11:20:00' },
    { title: 'Despedida junto a San Francisco', summary: 'Las últimas vistas de la basílica y del paisaje de Asís.', description: 'La peregrinación se despide de Asís junto a la basílica de San Francisco y la panorámica de la ciudad.', from: '2026-07-11T11:20:00', to: '2026-07-11T12:05:00' },
    { placeId: 'regreso-espana', title: 'Vuelta a España', summary: 'El regreso queda como cierre del itinerario, aunque no tenga fotografías.', includeMedia: false },
  ] },
};

function belongsToBlock(capturedAt: string, block: BlockDefinition) {
  if (block.includeMedia === false || (!block.from && !block.to)) return false;
  return (!block.from || capturedAt >= block.from) && (!block.to || capturedAt < block.to);
}

export function r2Url(key: string) {
  const endpoint = import.meta.env.CLOUDFLARE_R2_ENDPOINT?.replace(/\/$/, '');
  if (!endpoint) throw new Error('Falta CLOUDFLARE_R2_ENDPOINT.');
  return `${endpoint}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function getGalleryCover(slug: string) {
  const sourceDay = getDay(slug);
  const setup = sourceDay ? editorial[sourceDay.id] : undefined;
  return setup ? r2Url(setup.coverKey) : undefined;
}

export function getHomeDayPreviews(): HomeDayPreview[] {
  return Object.entries(editorial).map(([id, setup]) => {
    const sourceDay = pilgrimage.days.find((day) => day.id === id);
    if (!sourceDay) throw new Error(`No se ha encontrado la jornada ${id}.`);
    return {
      id,
      number: sourceDay.number,
      slug: sourceDay.slug,
      date: sourceDay.date,
      city: sourceDay.city,
      title: setup.title,
      summary: setup.summary,
      images: setup.previewKeys.map(r2Url) as [string, string],
      highlights: setup.highlights,
    };
  });
}

export async function getGalleryDay(slug: string): Promise<GalleryDay | undefined> {
  const sourceDay = getDay(slug); const setup = sourceDay ? editorial[sourceDay.id] : undefined;
  if (!sourceDay || !setup || !allowedDays.has(setup.prefix)) return undefined;
  const response = await fetch(r2Url('gallery-manifest.json'), { cache: 'no-store' });
  if (!response.ok) throw new Error('No se ha podido cargar gallery-manifest.json desde R2.');
  const manifest = manifestSchema.parse(await response.json());
  const sourceItems = manifest.items.filter((item) => item.key.startsWith(`${setup.prefix}/`)).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt) || a.key.localeCompare(b.key));
  const media = await Promise.all(sourceItems.map(async (item) => {
    const src = r2Url(item.key);
    return { ...item, src, thumbnailSrc: r2Url(`thumbnail/${item.key}`) };
  }));
  const blocks = setup.blocks.map((block, index) => {
    const place = block.placeId ? sourceDay.places.find((item) => item.id === block.placeId) : undefined;
    const { placeId: _placeId, includeMedia: _includeMedia, ...displayBlock } = block;
    return { ...displayBlock, description: block.description || place?.description || block.summary, id: `${slug}-${index + 1}`, media: media.filter((item) => belongsToBlock(item.capturedAt, block)) };
  });
  const assigned = new Set(blocks.flatMap((block) => block.media.map((item) => item.id)));
  const remaining = media.filter((item) => !assigned.has(item.id));
  if (remaining.length) blocks.push({ id: `${slug}-otros`, title: 'Otros momentos del día', summary: 'Recuerdos sin un bloque horario preciso.', description: 'Archivos que no encajan con seguridad en una parada concreta y se conservan al final de la jornada.', media: remaining });
  return { id: sourceDay.id, number: sourceDay.number, slug, date: sourceDay.date, city: sourceDay.city, title: setup.title, summary: setup.summary, cover: r2Url(setup.coverKey), blocks };
}
