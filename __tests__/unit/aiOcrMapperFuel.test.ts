import {
  validateFuelAiResponse,
  mergeFuelResults,
  extractFirstJsonObject,
} from '@/services/aiOcrMapper';
import type { FuelAiResult } from '@/services/aiOcrMapper';

describe('validateFuelAiResponse', () => {
  it('returns empty object for non-object input', () => {
    expect(validateFuelAiResponse(null)).toEqual({});
    expect(validateFuelAiResponse(undefined)).toEqual({});
    expect(validateFuelAiResponse('text')).toEqual({});
    expect(validateFuelAiResponse(42)).toEqual({});
  });

  it('accepts plausible liters (0.5 < L < 200)', () => {
    expect(validateFuelAiResponse({ liters: 42.31 })).toEqual({ liters: 42.31 });
    expect(validateFuelAiResponse({ liters: 0.6 })).toEqual({ liters: 0.6 });
    expect(validateFuelAiResponse({ liters: 199 })).toEqual({ liters: 199 });
  });

  it('rejects implausible liters', () => {
    expect(validateFuelAiResponse({ liters: 0 })).toEqual({});
    expect(validateFuelAiResponse({ liters: 0.4 })).toEqual({});
    expect(validateFuelAiResponse({ liters: 200 })).toEqual({});
    expect(validateFuelAiResponse({ liters: -5 })).toEqual({});
    expect(validateFuelAiResponse({ liters: '42' })).toEqual({});
  });

  it('accepts plausible price (1 < RON < 5000)', () => {
    expect(validateFuelAiResponse({ price: 285.5 })).toEqual({ price: 285.5 });
    expect(validateFuelAiResponse({ price: 2 })).toEqual({ price: 2 });
    expect(validateFuelAiResponse({ price: 4999 })).toEqual({ price: 4999 });
  });

  it('rejects implausible price', () => {
    expect(validateFuelAiResponse({ price: 1 })).toEqual({});
    expect(validateFuelAiResponse({ price: 5000 })).toEqual({});
    expect(validateFuelAiResponse({ price: -10 })).toEqual({});
    expect(validateFuelAiResponse({ price: '285' })).toEqual({});
  });

  it('accepts plausible km (1000 < km < 9999999, integer)', () => {
    expect(validateFuelAiResponse({ km: 125430 })).toEqual({ km: 125430 });
    expect(validateFuelAiResponse({ km: 1001 })).toEqual({ km: 1001 });
    expect(validateFuelAiResponse({ km: 9999998 })).toEqual({ km: 9999998 });
  });

  it('rejects implausible km', () => {
    expect(validateFuelAiResponse({ km: 1000 })).toEqual({});
    expect(validateFuelAiResponse({ km: 9999999 })).toEqual({});
    expect(validateFuelAiResponse({ km: 1234.5 })).toEqual({});
    expect(validateFuelAiResponse({ km: '125430' })).toEqual({});
  });

  it('accepts valid date in last 2 years', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(validateFuelAiResponse({ date: today })).toEqual({ date: today });
  });

  it('rejects future date, ancient date, or wrong format', () => {
    expect(validateFuelAiResponse({ date: '2099-01-01' })).toEqual({});
    expect(validateFuelAiResponse({ date: '1985-06-15' })).toEqual({});
    expect(validateFuelAiResponse({ date: '02.05.2026' })).toEqual({});
    expect(validateFuelAiResponse({ date: 'not-a-date' })).toEqual({});
  });

  it('rejects calendar-invalid dates that match the YYYY-MM-DD pattern', () => {
    // Bug bon MOL: AI a returnat "82.85.2026" (OCR a confundat 0→8); după
    // o conversie naivă putea ajunge "2026-85-82" — pattern-ul simplu trecea
    // dar luna 85 / ziua 82 nu există. Validatorul trebuie să respingă.
    expect(validateFuelAiResponse({ date: '2026-85-82' })).toEqual({});
    expect(validateFuelAiResponse({ date: '2026-13-01' })).toEqual({});
    expect(validateFuelAiResponse({ date: '2026-02-30' })).toEqual({});
    expect(validateFuelAiResponse({ date: '2026-00-15' })).toEqual({});
  });

  it('accepts plausible pump number (1-20)', () => {
    expect(validateFuelAiResponse({ pump: 1 })).toEqual({ pump: 1 });
    expect(validateFuelAiResponse({ pump: 2 })).toEqual({ pump: 2 });
    expect(validateFuelAiResponse({ pump: 20 })).toEqual({ pump: 20 });
  });

  it('accepts plausible priceL (0 < x < 100)', () => {
    expect(validateFuelAiResponse({ priceL: 9.82 })).toEqual({ priceL: 9.82 });
    expect(validateFuelAiResponse({ priceL: 2.5 })).toEqual({ priceL: 2.5 }); // bon altă țară
    expect(validateFuelAiResponse({ priceL: 99.5 })).toEqual({ priceL: 99.5 });
  });

  it('rejects implausible priceL', () => {
    expect(validateFuelAiResponse({ priceL: 0 })).toEqual({});
    expect(validateFuelAiResponse({ priceL: -1 })).toEqual({});
    expect(validateFuelAiResponse({ priceL: 100 })).toEqual({});
    expect(validateFuelAiResponse({ priceL: '9.82' })).toEqual({});
  });

  it('rejects implausible pump number', () => {
    expect(validateFuelAiResponse({ pump: 0 })).toEqual({});
    expect(validateFuelAiResponse({ pump: 21 })).toEqual({});
    expect(validateFuelAiResponse({ pump: -1 })).toEqual({});
    expect(validateFuelAiResponse({ pump: 2.5 })).toEqual({});
    expect(validateFuelAiResponse({ pump: '2' })).toEqual({});
  });

  it('accepts station, trims and caps at 100 chars', () => {
    expect(validateFuelAiResponse({ station: '  OMV Cluj-Napoca  ' })).toEqual({
      station: 'OMV Cluj-Napoca',
    });
    const long = 'A'.repeat(150);
    expect(validateFuelAiResponse({ station: long })).toEqual({ station: 'A'.repeat(100) });
  });

  it('rejects empty or whitespace-only station', () => {
    expect(validateFuelAiResponse({ station: '' })).toEqual({});
    expect(validateFuelAiResponse({ station: '   ' })).toEqual({});
    expect(validateFuelAiResponse({ station: 42 })).toEqual({});
  });

  it('combines multiple valid fields', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(
      validateFuelAiResponse({
        liters: 42.31,
        price: 285.5,
        km: 125430,
        date: today,
        station: 'OMV Cluj',
        pump: 4,
      })
    ).toEqual({
      liters: 42.31,
      price: 285.5,
      km: 125430,
      date: today,
      station: 'OMV Cluj',
      pump: 4,
    });
  });

  it('drops invalid fields but keeps valid ones', () => {
    expect(
      validateFuelAiResponse({
        liters: 42.31,
        price: -5,
        km: 'bad',
        station: 'OMV Cluj',
      })
    ).toEqual({
      liters: 42.31,
      station: 'OMV Cluj',
    });
  });

  it('rejects AI liters when implied RON/L is implausible (price/liter swap)', () => {
    // Bug MOL: AI confunda 9.82 (preț/litru) cu cantitatea pe linia
    // "9,82 X 106,84 L"; total era 1049,17 → 1049.17/9.82 ≈ 106.83 RON/L.
    expect(
      validateFuelAiResponse({
        liters: 9.82,
        price: 1049.17,
        date: '2026-05-02',
      })
    ).toEqual({
      price: 1049.17,
      date: '2026-05-02',
    });
  });

  it('keeps AI liters when implied RON/L is in plausible RO range', () => {
    // 1049.17 / 106.84 ≈ 9.82 RON/L → realistic pentru motorină 2026.
    expect(
      validateFuelAiResponse({
        liters: 106.84,
        price: 1049.17,
      })
    ).toEqual({
      liters: 106.84,
      price: 1049.17,
    });
  });
});

describe('mergeFuelResults', () => {
  it('returns empty when both inputs are empty', () => {
    expect(mergeFuelResults({}, {})).toEqual({
      liters: undefined,
      km: undefined,
      price: undefined,
      priceL: undefined,
      date: undefined,
      station: undefined,
      pump: undefined,
    });
  });

  it('AI per-field wins over regex', () => {
    const ai: FuelAiResult = { liters: 42.31, price: 285.5, priceL: 6.74, pump: 4 };
    const regex = {
      liters: 40,
      price: 200,
      priceL: 5.0,
      km: 125430,
      date: '2026-05-02',
      station: 'OMV',
      pump: 5,
    };
    expect(mergeFuelResults(ai, regex)).toEqual({
      liters: 42.31,
      price: 285.5,
      priceL: 6.74,
      km: 125430,
      date: '2026-05-02',
      station: 'OMV',
      pump: 4,
    });
  });

  it('falls back to regex priceL when AI nu-l returnează', () => {
    // Caz tipic MOL: AI sare peste priceL, regex îl extrage din X-pattern.
    const ai: FuelAiResult = { liters: 106.84, price: 1049.17 };
    const regex = { priceL: 9.82 };
    expect(mergeFuelResults(ai, regex).priceL).toBe(9.82);
  });

  it('falls back to regex when AI field missing', () => {
    const ai: FuelAiResult = { liters: 42.31 };
    const regex = { liters: 40, station: 'MOL', pump: 2 };
    expect(mergeFuelResults(ai, regex)).toEqual({
      liters: 42.31,
      km: undefined,
      price: undefined,
      priceL: undefined,
      date: undefined,
      station: 'MOL',
      pump: 2,
    });
  });

  it('treats AI undefined the same as missing', () => {
    const ai: FuelAiResult = { liters: undefined, station: 'AI Station', pump: undefined };
    const regex = { liters: 40, station: 'Regex Station', pump: 3 };
    expect(mergeFuelResults(ai, regex)).toEqual({
      liters: 40,
      km: undefined,
      price: undefined,
      priceL: undefined,
      date: undefined,
      station: 'AI Station',
      pump: 3,
    });
  });

  it('prefers regex.liters when AI disagrees by >10% (OCR digit confusion)', () => {
    // Caz real bon MOL: AI vision a confundat 1 cu 8 → 186.84 în loc de 106.84.
    // Regex are X-pattern cross-check și a corectat la 106.84. Diferența e huge.
    const ai: FuelAiResult = { liters: 186.84, price: 1049.17 };
    const regex = { liters: 106.84, price: 1049.17 };
    expect(mergeFuelResults(ai, regex).liters).toBe(106.84);
  });

  it('keeps AI.liters when regex disagrees by <10% (small variance ok)', () => {
    const ai: FuelAiResult = { liters: 42.31 };
    const regex = { liters: 42.0 }; // 0.7% diff — în limită
    expect(mergeFuelResults(ai, regex).liters).toBe(42.31);
  });
});

describe('extractFirstJsonObject', () => {
  it('returns null when no opening brace is present', () => {
    expect(extractFirstJsonObject('no json here')).toBeNull();
  });

  it('returns parsed object for bare JSON input', () => {
    expect(extractFirstJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON wrapped in ```json fences with trailing prose', () => {
    const raw = '```json\n{"liters": 42.31, "station": "OMV"}\n```\nThat is all.';
    expect(extractFirstJsonObject(raw)).toEqual({ liters: 42.31, station: 'OMV' });
  });

  it('returns the first parseable object when scanning from end finds an inner one', () => {
    // Scan-from-end strategy: it tries the largest envelope first; the largest
    // valid parse it can find from index 0 is the first standalone object.
    expect(extractFirstJsonObject('{"a":1}\nextra\n{"b":2}')).toEqual({ a: 1 });
  });

  it('returns null when an opening brace has no valid matching close', () => {
    expect(extractFirstJsonObject('{not valid')).toBeNull();
  });
});
