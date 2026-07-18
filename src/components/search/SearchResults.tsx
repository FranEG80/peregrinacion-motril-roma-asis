export interface SearchItem {
  id: string;
  day: string;
  title: string;
  summary: string;
  href: string;
  type: 'Día' | 'Lugar';
}

export default function SearchResults({ results }: { results: SearchItem[] }) {
  if (!results.length) {
    return <p class="m-0 rounded-plate border border-line bg-paper p-4 text-sm text-charcoal">No hemos encontrado coincidencias. Prueba con otro término.</p>;
  }

  return (
    <ul class="m-0 grid list-none gap-2 p-0">
      {results.map((item) => (
        <li key={item.id}>
          <a class="group block rounded-plate border border-line bg-white/90 p-4 text-charcoal no-underline shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-editorial hover:-translate-y-0.5 hover:border-gold hover:shadow-lift motion-reduce:transform-none motion-reduce:transition-none" href={item.href}>
            <span class="text-[0.65rem] font-extrabold tracking-[0.1em] text-gold uppercase">{item.type} · {item.day}</span>
            <strong class="mt-1 block font-serif text-xl font-medium">{item.title}</strong>
            <p class="mt-1 line-clamp-2 text-sm leading-6 text-muted">{item.summary}</p>
          </a>
        </li>
      ))}
    </ul>
  );
}
