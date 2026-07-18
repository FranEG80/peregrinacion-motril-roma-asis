import { Search, X } from 'lucide-preact';

interface Props {
  query: string;
  onChange: (value: string) => void;
}

export default function SearchField({ query, onChange }: Props) {
  return (
    <div class="grid min-h-13 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-hairline border border-stone bg-cream px-3 py-1.5 text-gold shadow-sm transition-[border-color,box-shadow] focus-within:border-gold focus-within:shadow-[0_0_0_3px_rgb(141_112_67_/_0.16)]">
      <Search aria-hidden="true" size={20} strokeWidth={1.8} />
      <input
        id="album-search-input"
        class="min-w-0 border-0 bg-transparent text-sm text-charcoal outline-0 placeholder:text-muted"
        type="search"
        value={query}
        onInput={(event) => onChange(event.currentTarget.value)}
        placeholder="Día, iglesia, plaza o recuerdo…"
      />
      {query && (
        <button class="grid size-10 place-items-center rounded-full border-0 bg-transparent text-gold transition-colors hover:bg-gold/10" type="button" aria-label="Borrar búsqueda" onClick={() => onChange('')}>
          <X aria-hidden="true" size={19} />
        </button>
      )}
    </div>
  );
}
