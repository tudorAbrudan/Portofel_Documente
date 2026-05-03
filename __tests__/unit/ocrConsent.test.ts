import { getDocTypeSensitivity, setPerTypeConsent } from '@/services/ocrConsent';

describe('getDocTypeSensitivity', () => {
  it('clasifică reteta_medicala ca medical', () => {
    expect(getDocTypeSensitivity('reteta_medicala')).toBe('medical');
  });

  it('clasifică analize_medicale ca medical', () => {
    expect(getDocTypeSensitivity('analize_medicale')).toBe('medical');
  });

  it('clasifică buletin ca sensitive', () => {
    expect(getDocTypeSensitivity('buletin')).toBe('sensitive');
  });

  it('clasifică rca ca sensitive', () => {
    expect(getDocTypeSensitivity('rca')).toBe('sensitive');
  });

  it('clasifică factura ca general', () => {
    expect(getDocTypeSensitivity('factura')).toBe('general');
  });

  it('clasifică contract ca general', () => {
    expect(getDocTypeSensitivity('contract')).toBe('general');
  });

  it('clasifică garantie ca general', () => {
    expect(getDocTypeSensitivity('garantie')).toBe('general');
  });
});

describe('setPerTypeConsent', () => {
  it('este o funcție exportată', () => {
    expect(typeof setPerTypeConsent).toBe('function');
  });
});
