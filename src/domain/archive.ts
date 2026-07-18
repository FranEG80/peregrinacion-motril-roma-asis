export interface ArchiveDay {
  number: number;
  slug: string;
}

export interface ArchiveBlock {
  title: string;
}

export function safeFilename(value: string) {
  return value.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function archiveName(day: ArchiveDay, block?: ArchiveBlock) {
  const stem = block
    ? `dia-${day.number}-${safeFilename(block.title)}`
    : `dia-${day.number}-${safeFilename(day.slug)}`;
  return `${stem || `dia-${day.number}`}.zip`;
}

export function archiveObjectKey(day: ArchiveDay, block?: ArchiveBlock) {
  return `downloads/${archiveName(day, block)}`;
}
