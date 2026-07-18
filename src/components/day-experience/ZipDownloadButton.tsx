import { FileArchive } from 'lucide-preact';

interface Props {
  href: string;
  label: string;
  fileCount: number;
  sizeBytes?: number;
  className?: string;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  const megabytes = bytes / 1_048_576;
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: megabytes < 10 ? 1 : 0,
    maximumFractionDigits: megabytes < 10 ? 1 : 0,
  }).format(megabytes)} MB`;
}

export default function ZipDownloadButton({ href, label, fileCount, sizeBytes, className = '' }: Props) {
  return (
    <span class={`grid justify-items-start gap-1 ${className}`.trim()}>
      <a
        class="inline-flex min-h-11 items-center gap-2 rounded-hairline border border-gold/70 bg-transparent px-3 py-2 text-[0.78rem] font-medium tracking-[0.01em] text-charcoal no-underline transition-[transform,border-color,background-color,color] duration-200 ease-editorial hover:-translate-y-px hover:border-gold hover:bg-gold hover:text-cream motion-reduce:transform-none motion-reduce:transition-none"
        href={href}
        download
        aria-disabled={fileCount === 0}
      >
        <FileArchive size={16} strokeWidth={1.7} aria-hidden="true" />
        {label}
      </a>
      {sizeBytes && <span class="text-[0.65rem] text-muted tabular-nums">{formatSize(sizeBytes)}</span>}
    </span>
  );
}
