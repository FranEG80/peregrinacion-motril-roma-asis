import { describe, expect, it } from 'vitest';
import { archiveName, archiveObjectKey, safeFilename } from './archive';

describe('archivos ZIP estáticos', () => {
  const day = { number: 2, slug: 'el-vaticano' };

  it('crea nombres estables para jornadas y paradas', () => {
    expect(archiveName(day)).toBe('dia-2-el-vaticano.zip');
    expect(archiveName(day, { title: 'Basílica de San Pedro' })).toBe('dia-2-basilica-de-san-pedro.zip');
    expect(archiveObjectKey(day)).toBe('downloads/dia-2-el-vaticano.zip');
  });

  it('normaliza nombres acentuados sin rutas ni símbolos', () => {
    expect(safeFilename('  Asís: último paseo / 2026  ')).toBe('asis-ultimo-paseo-2026');
  });
});
