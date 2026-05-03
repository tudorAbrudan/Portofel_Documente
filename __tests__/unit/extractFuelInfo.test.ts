import { extractFuelInfo } from '@/services/ocr';

// Reconstrucție OCR text pentru bonul MOL real
// (PIANU, AUTOSTRADA A1 ORASTIE-SIBIU — 02.05.2026)
const MOL_RECEIPT_TEXT = `MOL ROMANIA PETROLEUM PRODUCTS SRL
PIANU, AUTOSTRADA A1 ORASTIE-SIBIU, KM 316+360
STANGA, JUD. ALBA
COD FISCAL: RO7745470

NUMAR BON FISCAL: 122

OPERATIUNE: MOL A1 VINTU DE JOS ST.
MOL A1 VINTU DE JOS STANGA KM,
RC: 8000887592                          SB: 91707

DATA ELIBERARII:        02.05.2026 13:10:24
ID TRX/CHITANTA:                270299/159
LUCRATOR: 11

*2 MOTORINA EVO D
9,82 X106,84 L                          1049,17 A

PLATA: C A R D  B A N C A R
5358 19** **** 4138    AUTOR. COD: 853795

SUBTOTAL:                               1049,17

TOTAL:                                  1049,17
CARD                                    1049,17
REST                                    0,00
TOTAL TVA A                             182,09
COTA TVA A = 21,00 %
TOTAL TVA                               182,09

INREGISTREAZA-TE IN PROGRAMUL MOL MOVE
SI PRIMESTI O RECOMPENSA

MULTUMIM PENTRU VIZITA. O CALATORIE PLACUTA
DATA: 02/05/2026                        ORA: 13:11:29
                BON FISCAL
                8000887592`;

describe('extractFuelInfo — MOL receipt', () => {
  const info = extractFuelInfo(MOL_RECEIPT_TEXT);

  it('extracts liters from "9,82 X106,84 L" picking the cantity (after X), not price/L', () => {
    expect(info.liters).toBe(106.84);
  });

  it('extracts price from TOTAL line (1049,17)', () => {
    expect(info.price).toBe(1049.17);
  });

  it('extracts date as ISO YYYY-MM-DD', () => {
    expect(info.date).toBe('2026-05-02');
  });

  it('extracts pump number from "*2 MOTORINA"', () => {
    expect(info.pump).toBe(2);
  });

  it('does NOT extract km from highway address ("KM 316+360")', () => {
    // Adresa stației pe autostradă NU e odometrul mașinii.
    expect(info.km).toBeUndefined();
  });

  it('extracts station with brand + address', () => {
    expect(info.station).toMatch(/^MOL/);
    expect(info.station).toContain('PIANU');
  });
});

describe('extractFuelInfo — pump variants', () => {
  it('extracts pump from "*1 BENZINA"', () => {
    expect(extractFuelInfo('*1 BENZINA 95\n40,00 X 7,50 L').pump).toBe(1);
  });

  it('extracts pump from "*5 MOTORINA"', () => {
    expect(extractFuelInfo('*5 MOTORINA EURO 5').pump).toBe(5);
  });

  it('extracts pump from "*12 GPL"', () => {
    expect(extractFuelInfo('*12 GPL 50,00 L').pump).toBe(12);
  });

  it('returns undefined when no pump marker present', () => {
    expect(extractFuelInfo('TOTAL: 100,00').pump).toBeUndefined();
  });
});

describe('extractFuelInfo — km only with explicit odometer keyword', () => {
  it('extracts km from "Odometru: 125430"', () => {
    expect(extractFuelInfo('Odometru: 125430').km).toBe(125430);
  });

  it('extracts km from "Rulaj 89500"', () => {
    expect(extractFuelInfo('Rulaj 89500').km).toBe(89500);
  });

  it('extracts km from "Kilometraj: 250000"', () => {
    expect(extractFuelInfo('Kilometraj: 250000').km).toBe(250000);
  });

  it('does NOT extract km from "KM 316+360" (highway address)', () => {
    expect(extractFuelInfo('AUTOSTRADA A1 KM 316+360').km).toBeUndefined();
  });

  it('does NOT extract km from "KM 316360" (concatenated highway)', () => {
    // Chiar dacă OCR concatenează "316+360" → "316360", fără cuvânt-cheie
    // de odometru rămâne ambiguu și NU completăm automat.
    expect(extractFuelInfo('AUTOSTRADA A1 KM 316360').km).toBeUndefined();
  });
});

describe('extractFuelInfo — total prefers exact TOTAL over SUBTOTAL when different', () => {
  it('picks 950 from TOTAL line, not 1000 from SUBTOTAL', () => {
    const text = `SUBTOTAL: 1000,00
DISCOUNT: -50,00
TOTAL: 950,00`;
    expect(extractFuelInfo(text).price).toBe(950);
  });
});

describe('extractFuelInfo — priceL from X-pattern (folosit la cross-check UI)', () => {
  it('extrage priceL=9.82 din "9,82 X 106,84 L"', () => {
    expect(extractFuelInfo('9,82 X 106,84 L  1049,17').priceL).toBe(9.82);
  });

  it('extrage priceL chiar și când e în afara range-ului RO 4-15 (ex. bon din altă țară)', () => {
    // Acest priceL nu va declanșa cross-check matematic pentru `liters`,
    // dar îl expunem oricum ca să-l afișăm în câmp și să facă math-check în UI.
    expect(extractFuelInfo('2,50 X 100,00 L').priceL).toBe(2.5);
  });

  it('NU extrage priceL când nu există X-pattern', () => {
    expect(extractFuelInfo('TOTAL: 250,00').priceL).toBeUndefined();
  });
});

describe('extractFuelInfo — X-pattern math cross-check (catches OCR digit confusion)', () => {
  it('corrects misread 186,84 → 106,84 using TOTAL/priceL', () => {
    // Bug real: vision/AI a confundat 1 cu 8 ("106,84" → "186,84").
    // Cross-check: 1049.17 / 9.82 = 106.84 — folosit ca sursă de adevăr.
    const text = `*2 MOTORINA EVO D
9,82 X 186,84 L                          1049,17 A
TOTAL:                                  1049,17`;
    expect(extractFuelInfo(text).liters).toBe(106.84);
  });

  it('keeps OCR cantity when math agrees (no false correction)', () => {
    const text = `9,82 X 106,84 L                          1049,17
TOTAL:                                  1049,17`;
    expect(extractFuelInfo(text).liters).toBe(106.84);
  });

  it('keeps OCR cantity when no TOTAL available', () => {
    const text = `9,82 X 186,84 L`;
    expect(extractFuelInfo(text).liters).toBe(186.84);
  });

  it('skips X cross-check when priceL implausible (e.g. 2,50 RON/L)', () => {
    // priceL 2.50 < 4 RON/L → suspect OCR error pe priceL însuși; nu folosim.
    // Cantitatea o luăm din pattern-ul standard "L".
    const text = `2,50 X 100,00 L                          250,00
TOTAL:                                  250,00`;
    expect(extractFuelInfo(text).liters).toBe(100);
  });
});
