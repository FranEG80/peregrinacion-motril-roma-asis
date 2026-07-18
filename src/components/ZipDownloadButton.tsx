import { FileArchive } from 'lucide-preact';
import { useState } from 'preact/hooks';

interface Props {
  dayId: string;
  blockId?: string;
  label: string;
  fileCount: number;
  className?: string;
}

export default function ZipDownloadButton({ dayId, blockId, label, fileCount, className = '' }: Props) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    setPreparing(true);
    setError('');
    try {
      const response = await fetch('/api/zip-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ dayId, blockId }),
      });
      const result = await response.json() as { url?: unknown; error?: string };
      if (!response.ok || typeof result.url !== 'string') {
        throw new Error(result.error || 'No se ha podido preparar el ZIP.');
      }
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido preparar el ZIP.');
    } finally {
      setPreparing(false);
    }
  }

  return (
    <span class={`zip-download ${className}`.trim()}>
      <button type="button" disabled={preparing || fileCount === 0} onClick={download}>
        <FileArchive size={16} strokeWidth={1.7} aria-hidden="true" />
        {preparing ? 'Preparando…' : label}
      </button>
      <span class="zip-download__error" role="alert" aria-live="polite">{error}</span>
    </span>
  );
}
