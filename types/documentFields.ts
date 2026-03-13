import type { DocumentType } from './index';

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  ocrKey?: string;
}

export const DOCUMENT_FIELDS: Partial<Record<DocumentType, FieldDef[]>> = {
  buletin: [
    { key: 'cnp', label: 'CNP', placeholder: '1234567890123', keyboardType: 'numeric', ocrKey: 'cnp' },
    { key: 'series', label: 'Serie', placeholder: 'RT 123456', ocrKey: 'series' },
    { key: 'name', label: 'Nume complet', placeholder: 'POPESCU ION', ocrKey: 'name' },
  ],
  pasaport: [
    { key: 'series', label: 'Nr. pașaport', placeholder: 'SN123456', ocrKey: 'series' },
    { key: 'name', label: 'Nume complet', placeholder: 'POPESCU ION', ocrKey: 'name' },
  ],
  permis_auto: [
    { key: 'series', label: 'Nr. permis', placeholder: 'RO 123456', ocrKey: 'series' },
    { key: 'categories', label: 'Categorii', placeholder: 'B, AM' },
  ],
  talon: [
    { key: 'plate', label: 'Nr. înmatriculare', placeholder: 'B 123 ABC' },
    { key: 'vin', label: 'Serie șasiu (VIN)', placeholder: 'WVWZZZ...' },
    { key: 'make_model', label: 'Marcă / Model', placeholder: 'Volkswagen Golf' },
  ],
  carte_auto: [
    { key: 'plate', label: 'Nr. înmatriculare', placeholder: 'B 123 ABC' },
    { key: 'vin', label: 'Serie șasiu (VIN)', placeholder: 'WVWZZZ...' },
    { key: 'make_model', label: 'Marcă / Model', placeholder: 'Volkswagen Golf' },
  ],
  rca: [
    { key: 'policy_number', label: 'Nr. poliță', placeholder: 'RO/...' },
    { key: 'insurer', label: 'Asigurator', placeholder: 'Allianz, Groupama...' },
    { key: 'plate', label: 'Nr. înmatriculare', placeholder: 'B 123 ABC' },
  ],
  itp: [
    { key: 'plate', label: 'Nr. înmatriculare', placeholder: 'B 123 ABC' },
    { key: 'station', label: 'Stație ITP', placeholder: 'Auto Test SRL' },
  ],
  vigneta: [
    { key: 'plate', label: 'Nr. înmatriculare', placeholder: 'B 123 ABC' },
    { key: 'country', label: 'Țară', placeholder: 'Austria, Ungaria...' },
  ],
  act_proprietate: [
    { key: 'address', label: 'Adresă proprietate', placeholder: 'Str. ...' },
    { key: 'surface', label: 'Suprafață (mp)', placeholder: '75', keyboardType: 'numeric' },
  ],
  cadastru: [
    { key: 'cadastral_number', label: 'Nr. cadastral', placeholder: '12345' },
    { key: 'uat', label: 'UAT', placeholder: 'București, Sector 1' },
  ],
  factura: [
    { key: 'invoice_number', label: 'Nr. factură', placeholder: 'FAC001' },
    { key: 'supplier', label: 'Furnizor', placeholder: 'Enel, Digi...' },
    { key: 'amount', label: 'Sumă (RON)', placeholder: '250.00', keyboardType: 'decimal-pad', ocrKey: 'amount' },
    { key: 'due_date', label: 'Scadentă', placeholder: 'AAAA-LL-ZZ' },
  ],
  card: [
    { key: 'last4', label: 'Ultimele 4 cifre', placeholder: '1234', keyboardType: 'numeric', ocrKey: 'last4' },
    { key: 'bank', label: 'Bancă', placeholder: 'BRD, BCR, ING...' },
  ],
};
