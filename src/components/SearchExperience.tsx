import { Search, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';

interface SearchItem {
  id: string;
  day: string;
  title: string;
  summary: string;
  href: string;
  type: 'Día' | 'Lugar';
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function SearchExperience({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = normalize(query.trim());
    if (!normalized) return [];
    return items.filter((item) => normalize(`${item.day} ${item.title} ${item.summary}`).includes(normalized)).slice(0, 8);
  }, [items, query]);

  return (
    <search class="album-search">
      <label for="album-search-input">Buscar en la peregrinación</label>
      <div class="search-field">
        <Search aria-hidden="true" size={24} strokeWidth={1.8} />
        <input id="album-search-input" type="search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="Día, iglesia, plaza o recuerdo…" />
        {query && <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')}><X aria-hidden="true" size={22} /></button>}
      </div>
      <p class="search-status" aria-live="polite">{query ? `${results.length} resultados` : 'Escribe para buscar por día o lugar'}</p>
      {query && (
        <ul class="search-results">
          {results.length ? results.map((item) => (
            <li key={item.id}><a href={item.href}><span>{item.type} · {item.day}</span><strong>{item.title}</strong><p>{item.summary}</p></a></li>
          )) : <li class="empty">No hemos encontrado coincidencias. Prueba con otro término.</li>}
        </ul>
      )}
    </search>
  );
}

