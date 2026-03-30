/**
 * Unit tests pentru fileUtils — conversii path-uri fișiere.
 * FileSystem.documentDirectory este mockat la 'file:///test/Documents/'
 */

import { toFileUri, toRelativePath } from '@/services/fileUtils';

const DOC_DIR = 'file:///test/Documents/';

describe('toFileUri', () => {
  it('returnează string gol pentru input gol', () => {
    expect(toFileUri('')).toBe('');
  });

  it('lasă URI file:// neschimbat', () => {
    const uri = 'file:///test/Documents/doc.jpg';
    expect(toFileUri(uri)).toBe(uri);
  });

  it('adaugă prefix file:// la path absolut', () => {
    expect(toFileUri('/var/mobile/Documents/doc.jpg')).toBe('file:///var/mobile/Documents/doc.jpg');
  });

  it('convertește path relativ la URI complet', () => {
    expect(toFileUri('documents/doc_123.jpg')).toBe(`${DOC_DIR}documents/doc_123.jpg`);
  });

  it('convertește path relativ fără subdirector', () => {
    expect(toFileUri('backup.zip')).toBe(`${DOC_DIR}backup.zip`);
  });
});

describe('toRelativePath', () => {
  it('returnează string gol pentru input gol', () => {
    expect(toRelativePath('')).toBe('');
  });

  it('lasă path deja relativ neschimbat', () => {
    expect(toRelativePath('documents/doc_123.jpg')).toBe('documents/doc_123.jpg');
  });

  it('convertește URI file:// la path relativ', () => {
    const absolute = `${DOC_DIR}documents/doc_123.jpg`;
    expect(toRelativePath(absolute)).toBe('documents/doc_123.jpg');
  });

  it('convertește path absolut (fără file://) la path relativ', () => {
    const absPath = '/test/Documents/documents/doc_123.jpg';
    expect(toRelativePath(absPath)).toBe('documents/doc_123.jpg');
  });

  it('returnează path-ul original dacă nu se poate converti (path extern)', () => {
    const external = 'file:///external/path/doc.jpg';
    expect(toRelativePath(external)).toBe(external);
  });

  it('convertește și path-uri de backup', () => {
    const absolute = `${DOC_DIR}acte_backup_2024-01-01.zip`;
    expect(toRelativePath(absolute)).toBe('acte_backup_2024-01-01.zip');
  });
});
