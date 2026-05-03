import { sendAiRequest, sendAiRequestWithImage } from './aiProvider';
import type { ExtractResult } from './ocrExtractors';
import type { DocumentType } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

const MAX_OCR_CHARS = 3000;

interface TypeConfig {
  fieldsHint: string;
  noteInstruction: string;
}

const TYPE_CONFIG: Partial<Record<DocumentType, TypeConfig>> = {
  analize_medicale: {
    fieldsHint:
      'lab (laboratorul: Synevo/MedLife/Regina Maria etc.), doctor (medic solicitant — "Dr.", "Medic solicitant", "Solicitat de"), pacient (numele pacientului — "Pacient:", "Nume:")',
    noteInstruction:
      'Listează TOATE analizele găsite, câte una pe rând, format: "Nume analiză: Valoare Unitate (ref: Min-Max)" sau "Nume analiză: Valoare Unitate". Adaugă la început: Pacient, Laborator, Medic, Data recoltare (dacă le găsești). Max 40 rânduri.',
  },
  reteta_medicala: {
    fieldsHint:
      'doctor (medic prescriptor — "Dr.", "Medic"), medication_1 (primul medicament după "Rp:" sau "1.")',
    noteInstruction:
      'Listează medicamentele prescrise cu doze, frecvență și durată. Adaugă: Medic, Data, Diagnostic, Unitate medicală (dacă apar). Include orice alte informații relevante din document.',
  },
  factura: {
    fieldsHint:
      'supplier (furnizor — din antet), invoice_number (numărul facturii), amount (total de plată), due_date (scadență ZZ.LL.AAAA), period (perioada de facturare)',
    noteInstruction:
      'Furnizor, Nr. factură, Sumă totală, Scadență, Perioadă facturare, Adresă livrare/consum, Nr. client/contract, detalii consum (dacă apar). Include toate valorile și identificatorii găsiți.',
  },
  contract: {
    fieldsHint: 'tip_contract (Chirie/Prestări servicii/Vânzare-cumpărare etc.), amount (valoare)',
    noteInstruction:
      'Tip contract, Valoare, Toate părțile contractante (nume, CNP/CUI, adrese), Durată, Perioadă, Obiect contract, Clauze importante. Include toți identificatorii și datele găsite.',
  },
  garantie: {
    fieldsHint: 'product_name (produsul garantat), serie_produs (seria/numărul de serie)',
    noteInstruction:
      'Produs, Serie/Nr. bon, Perioadă garanție, Vânzător, Magazin, Data cumpărare, Condiții garanție. Include toți identificatorii găsiți.',
  },
  abonament: {
    fieldsHint: 'service_name (serviciul: Netflix/Spotify etc.), amount (suma lunară/anuală)',
    noteInstruction:
      'Serviciu, Sumă, Periodicitate, Data reînnoire, Nr. cont/abonat, Beneficii incluse. Include toate detaliile găsite.',
  },
};

function buildPrompt(typeLabel: string, config: TypeConfig | undefined, ocrText: string): string {
  const fieldsInstruction = config?.fieldsHint
    ? `Câmpuri specifice pentru „${typeLabel}": ${config.fieldsHint}`
    : `Câmpuri utile în metadata: supplier, amount, invoice_number, tip_contract, policy_number, plate, vin, cnp, series, marca, model, due_date, period, insurer, bank, last4, lab, doctor, product_name — DOAR dacă le găsești`;

  const noteInstruction =
    config?.noteInstruction ??
    'Rezumat structurat cu informațiile cheie: identificatori (nr. document, serie, cod, poliță, VIN etc.), date importante, sume, nume și firme relevante. Format "Câmp: Valoare", câte un câmp pe rând. Max 15 rânduri. Omite informații administrative sau redundante.';

  const textSection = ocrText.trim()
    ? `\nText OCR (referință secundară):\n---\n${ocrText.slice(0, MAX_OCR_CHARS)}\n---`
    : '';

  return `Extrage câmpurile structurate din acest document românesc.
Tip document: ${typeLabel}${textSection}

Returnează DOAR JSON valid, fără text suplimentar:
{
  "issue_date": "YYYY-MM-DD sau null",
  "expiry_date": "YYYY-MM-DD sau null",
  "note": "...",
  "metadata": { "cheie": "valoare" }
}

Reguli:
- ${fieldsInstruction}
- note: ${noteInstruction}
- Nu inventa valori. Dacă nu găsești o informație, omite câmpul sau pune null
- Datele în format YYYY-MM-DD
- amount cu punct zecimal (ex: "123.45")`;
}

function parseResponse(response: string): ExtractResult {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { metadata: {} };

  let parsed: {
    issue_date?: string | null;
    expiry_date?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { metadata: {} };
  }

  const metadata: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.metadata ?? {})) {
    if (typeof v === 'string' && v.trim()) metadata[k] = v.trim();
  }

  return {
    metadata,
    issue_date: typeof parsed.issue_date === 'string' ? parsed.issue_date : undefined,
    expiry_date: typeof parsed.expiry_date === 'string' ? parsed.expiry_date : undefined,
    note: typeof parsed.note === 'string' && parsed.note.trim() ? parsed.note.trim() : undefined,
  };
}

/**
 * Extrage câmpuri structurate din document.
 * Când imageBase64 e furnizat, trimite imaginea la AI (vision) pentru rezultate mai bune.
 * Fallback automat la text-only dacă imaginea lipsește sau modelul nu suportă vision.
 */
export async function extractFieldsWithLlm(
  type: DocumentType,
  ocrText: string,
  imageBase64?: string
): Promise<ExtractResult> {
  const typeLabel = DOCUMENT_TYPE_LABELS[type] ?? type;
  const config = TYPE_CONFIG[type];
  const prompt = buildPrompt(typeLabel, config, ocrText);

  const systemPrompt = `Ești un expert în extragerea datelor structurate din documente românești. Returnezi EXCLUSIV JSON valid.`;

  let response: string;
  if (imageBase64) {
    response = await sendAiRequestWithImage(systemPrompt, prompt, imageBase64, 'image/jpeg', 1200);
  } else {
    response = await sendAiRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      1000
    );
  }

  return parseResponse(response);
}
