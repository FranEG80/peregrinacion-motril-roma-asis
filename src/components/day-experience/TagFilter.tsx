import { Filter } from 'lucide-preact';

interface Props {
  tags: { tag: string; count: number }[];
  activeTag: string | null;
  onChange: (tag: string | null) => void;
}

export default function TagFilter({ tags, activeTag, onChange }: Props) {
  if (!tags.length) return null;
  return (
    <details class="min-w-0">
      <summary class="flex min-h-12 w-max max-w-full cursor-pointer items-center gap-2 text-[0.8rem] font-medium text-charcoal">
        <Filter size={15} strokeWidth={1.8} aria-hidden="true" />
        Filtrar por etiquetas {activeTag && <span class="text-gold">· {activeTag}</span>}
      </summary>
      <div class="flex flex-wrap gap-2 pb-3">
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            class={`rounded-full border px-3 py-1.5 text-[0.72rem] font-normal transition-colors ${activeTag === tag ? 'border-gold bg-gold text-cream' : 'border-line bg-cream text-muted hover:border-gold hover:text-charcoal'}`}
            aria-pressed={activeTag === tag}
            onClick={() => onChange(activeTag === tag ? null : tag)}
          >
            {tag}<span class="ml-1 opacity-70">{count}</span>
          </button>
        ))}
        {activeTag && <button type="button" class="px-2 text-xs font-medium text-charcoal underline decoration-line underline-offset-4" onClick={() => onChange(null)}>Quitar filtro</button>}
      </div>
    </details>
  );
}
