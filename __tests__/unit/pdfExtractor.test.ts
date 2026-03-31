/**
 * Unit tests pentru funcțiile pure din pdfExtractor.
 * Toate funcțiile testate rulează în Node.js fără dependențe native.
 */

import {
  isPdfFile,
  parseToUnicodeCMap,
  decodeHexStr,
  decodePdfStr,
  decodeAscii85,
} from '@/services/pdfExtractor';

// ─── isPdfFile ─────────────────────────────────────────────────────────────────

describe('isPdfFile', () => {
  it('recunoaște extensie .pdf', () => {
    expect(isPdfFile('document.pdf')).toBe(true);
  });

  it('recunoaște extensie .PDF (majuscule)', () => {
    expect(isPdfFile('FACTURĂ.PDF')).toBe(true);
  });

  it('recunoaște extensie mixtă .Pdf', () => {
    expect(isPdfFile('fisier.Pdf')).toBe(true);
  });

  it('respinge .jpg', () => {
    expect(isPdfFile('poza.jpg')).toBe(false);
  });

  it('respinge string gol', () => {
    expect(isPdfFile('')).toBe(false);
  });

  it('respinge fișier fără extensie', () => {
    expect(isPdfFile('document')).toBe(false);
  });

  it('respinge .pdf.jpg (extensie dublă, ultima nu e pdf)', () => {
    expect(isPdfFile('document.pdf.jpg')).toBe(false);
  });
});

// ─── parseToUnicodeCMap ────────────────────────────────────────────────────────

describe('parseToUnicodeCMap', () => {
  it('parsează beginbfchar corect', () => {
    const cmap = `
      beginbfchar
      <0041> <0061>
      <0042> <0062>
      <0043> <0063>
      endbfchar
    `;
    const map = parseToUnicodeCMap(cmap);
    expect(map.get(0x0041)).toBe('a');
    expect(map.get(0x0042)).toBe('b');
    expect(map.get(0x0043)).toBe('c');
  });

  it('parsează beginbfrange corect', () => {
    // Range <0041> → <0043> mapat la A, B, C (Unicode 0x41, 0x42, 0x43)
    const cmap = `
      beginbfrange
      <0041> <0043> <0041>
      endbfrange
    `;
    const map = parseToUnicodeCMap(cmap);
    expect(map.get(0x0041)).toBe('A');
    expect(map.get(0x0042)).toBe('B');
    expect(map.get(0x0043)).toBe('C');
  });

  it('returnează map gol pentru conținut fără CMap', () => {
    const map = parseToUnicodeCMap('no cmap here');
    expect(map.size).toBe(0);
  });

  it('parsează CMap cu mai multe blocuri beginbfchar', () => {
    const cmap = `
      beginbfchar
      <0001> <0041>
      endbfchar
      beginbfchar
      <0002> <0042>
      endbfchar
    `;
    const map = parseToUnicodeCMap(cmap);
    expect(map.get(1)).toBe('A');
    expect(map.get(2)).toBe('B');
  });

  it('ignoră linii invalide în interiorul blocului', () => {
    const cmap = `
      beginbfchar
      <0041> <0041>
      text invalid
      <0042> <0042>
      endbfchar
    `;
    const map = parseToUnicodeCMap(cmap);
    expect(map.get(0x41)).toBe('A');
    expect(map.get(0x42)).toBe('B');
  });
});

// ─── decodeHexStr ──────────────────────────────────────────────────────────────

describe('decodeHexStr', () => {
  it('decodează hex 1-byte (stride 2) fără glyphMap', () => {
    // '41' = 'A', '42' = 'B'
    expect(decodeHexStr('4142', null)).toBe('');
    // '41' singur — lungime 2, 2 % 4 !== 0, deci stride=2
    expect(decodeHexStr('41', null)).toBe('A');
  });

  it('decodează hex 2-byte (stride 4) cu glyphMap', () => {
    const glyphMap = new Map<number, string>([
      [0x0041, 'a'],
      [0x0042, 'b'],
    ]);
    // '00410042' — lungime 8, 8 % 4 === 0, stride=4
    expect(decodeHexStr('00410042', glyphMap)).toBe('ab');
  });

  it('returnează string gol pentru hex gol', () => {
    expect(decodeHexStr('', null)).toBe('');
  });

  it('folosește glyphMap pentru a converti coduri nemapate la gol', () => {
    const glyphMap = new Map<number, string>([[0x0041, 'X']]);
    // Cod 0x0042 nu e în glyphMap → ''
    expect(decodeHexStr('00420041', glyphMap)).toBe('X');
  });

  it('ignoră caractere non-printabile fără glyphMap (stride 2)', () => {
    // '\x01' = cod 1 — non-printabil (< 32)
    expect(decodeHexStr('01', null)).toBe('');
  });
});

// ─── decodePdfStr ─────────────────────────────────────────────────────────────

describe('decodePdfStr', () => {
  it('decodează Windows-1252: \\x80 → €', () => {
    expect(decodePdfStr('\x80')).toBe('€');
  });

  it('decodează Windows-1252: \\x96 → –', () => {
    expect(decodePdfStr('\x96')).toBe('–');
  });

  it('elimină caractere de control', () => {
    expect(decodePdfStr('abc\x01\x08def')).toBe('abcdef');
  });

  it('detectează UTF-16BE și elimină null bytes (>25% nulls)', () => {
    // 'Hello' în UTF-16BE: H\x00e\x00l\x00l\x00o\x00 — 5 nulls din 10 chars = 50%
    const utf16 = 'H\x00e\x00l\x00l\x00o\x00';
    expect(decodePdfStr(utf16)).toBe('Hello');
  });

  it('lasă text ASCII normal nemodificat', () => {
    expect(decodePdfStr('Factura 2024')).toBe('Factura 2024');
  });

  it('decodează Windows-1252: \\x84 → „ (ghilimele deschise românești)', () => {
    expect(decodePdfStr('\x84')).toBe('„');
  });
});

// ─── decodeAscii85 ────────────────────────────────────────────────────────────

describe('decodeAscii85', () => {
  it('decodează "z" (shorthand pentru 4 zero bytes)', () => {
    const result = decodeAscii85('z~>');
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  it('decodează un grup complet de 5 caractere', () => {
    // '!!!!!' în ASCII85 = 0x00000000
    const result = decodeAscii85('!!!!!~>');
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  it('ignoră whitespace', () => {
    const r1 = decodeAscii85('z~>');
    const r2 = decodeAscii85('z \n ~>');
    expect(r1).toEqual(r2);
  });

  it('decodează grup incomplet (padding cu u)', () => {
    // Un grup de 2 chars → 1 byte output
    const result = decodeAscii85('!!~>');
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);
  });

  it('decodează input fără marker ~>', () => {
    // Trebuie să funcționeze și fără markerul de sfârșit
    const result = decodeAscii85('z');
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
  });
});
