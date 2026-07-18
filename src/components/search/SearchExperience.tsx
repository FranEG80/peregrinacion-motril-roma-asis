import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { useMemo, useState } from 'preact/hooks';
import SearchField from './SearchField';
import SearchResults, { type SearchItem } from './SearchResults';

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export default function SearchExperience({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState('');
  const [resultsParent] = useAutoAnimate<HTMLDivElement>({ duration: 170 });
  const results = useMemo(() => {
    const normalized = normalize(query.trim());
    if (!normalized) return [];
    return items.filter((item) => normalize(`${item.day} ${item.title} ${item.summary}`).includes(normalized)).slice(0, 8);
  }, [items, query]);

  return (
    <search class="block text-charcoal">
      <label class="mb-2 block text-[0.78rem] font-medium tracking-[0.02em]" for="album-search-input">Buscar en la peregrinación</label>
      <SearchField query={query} onChange={setQuery} />
      <p class="mt-2 mb-0 text-xs text-muted" aria-live="polite">{query ? `${results.length} resultados` : 'Escribe para buscar por día o lugar'}</p>
      <div class="mt-4" ref={resultsParent}>
        {query && <SearchResults results={results} />}
      </div>
    </search>
  );
}
