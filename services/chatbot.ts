import { getPersons, getProperties, getVehicles, getCards, getAnimals } from './entities';
import { getDocuments } from './documents';
import { DOCUMENT_TYPE_LABELS } from '@/types';
import { sendAiRequest } from './aiProvider';
import type { AiMessage } from './aiProvider';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function buildContext(): Promise<string> {
  const [persons, properties, vehicles, cards, animals, documents] = await Promise.all([
    getPersons(),
    getProperties(),
    getVehicles(),
    getCards(),
    getAnimals(),
    getDocuments(),
  ]);

  const lines: string[] = ['=== DATE APLICAȚIE ==='];

  if (persons.length) {
    const personStrings = persons.map(p => {
      const parts: string[] = [p.name];
      if (p.phone) parts.push(`tel: ${p.phone}`);
      if (p.email) parts.push(`email: ${p.email}`);
      if (p.iban) parts.push(`IBAN: ${p.iban}`);
      return parts.length > 1 ? `${p.name} (${parts.slice(1).join(', ')})` : p.name;
    });
    lines.push(`Persoane: ${personStrings.join(', ')}`);
  }
  if (properties.length) lines.push(`Proprietăți: ${properties.map(p => p.name).join(', ')}`);
  if (vehicles.length) lines.push(`Vehicule: ${vehicles.map(v => v.name).join(', ')}`);
  if (cards.length)
    lines.push(`Carduri: ${cards.map(c => `${c.nickname} (****${c.last4})`).join(', ')}`);
  if (animals.length)
    lines.push(`Animale: ${animals.map(a => `${a.name} (${a.species})`).join(', ')}`);

  if (!persons.length && !properties.length && !vehicles.length && !cards.length && !animals.length && !documents.length) {
    return 'NU EXISTĂ DATE ÎN APLICAȚIE. Utilizatorul nu a adăugat nicio entitate sau document.';
  }

  lines.push('\nDocumente:');
  if (!documents.length) {
    lines.push('(niciun document adăugat)');
  }
  for (const doc of documents) {
    const entity =
      persons.find(p => p.id === doc.person_id)?.name ??
      vehicles.find(v => v.id === doc.vehicle_id)?.name ??
      properties.find(p => p.id === doc.property_id)?.name ??
      cards.find(c => c.id === doc.card_id)?.nickname ??
      animals.find(a => a.id === doc.animal_id)?.name ??
      null;
    const label = DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type;
    const expiry = doc.expiry_date ? ` | expiră: ${doc.expiry_date}` : '';
    const issued = doc.issue_date ? ` | emis: ${doc.issue_date}` : '';
    const entityStr = entity ? ` (${entity})` : '';
    const note = doc.note ? ` | notă: ${doc.note}` : '';

    // Metadata specifică tipului (nr. înmatriculare, CNP, serie, etc.)
    let meta = '';
    if (doc.metadata) {
      try {
        const parsed = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
        const metaParts = Object.entries(parsed as Record<string, string>)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        if (metaParts.length) meta = ` | ${metaParts.join(', ')}`;
      } catch {
        /* metadata coruptă */
      }
    }

    // Text OCR complet (trunchiat la 800 de caractere pentru context)
    const ocrText = doc.ocr_text
      ? ` | OCR: ${doc.ocr_text.slice(0, 800)}${doc.ocr_text.length > 800 ? '…' : ''}`
      : '';

    lines.push(`- [ID:${doc.id}] ${label}${entityStr}${issued}${expiry}${note}${meta}${ocrText}`);
  }

  return lines.join('\n');
}

export async function sendMessage(userMessage: string, history: ChatMessage[]): Promise<string> {
  const context = await buildContext();

  const systemPrompt = `Ești un asistent pentru aplicația de documente personale. Răspunzi în română.
Ai acces la datele utilizatorului:

${context}

## Reguli generale
- Fii concis și util
- Bazează-te STRICT pe datele de mai sus; NICIODATĂ nu inventa, presupune sau genera date care nu există explicit
- Dacă datele de mai sus indică "NU EXISTĂ DATE" sau "(niciun document adăugat)", răspunde că nu există date — nu genera exemple, nu sugera date fictive
- Când menționezi un document specific, include ID-ul în format [ID:xxx] ca să poată fi deschis

## Formate speciale — returnează EXACT formatul de mai jos când e cerut

### Check-in avion / date pașaport
Când cere "check-in", "boarding", "date pașaport" pentru o persoană:
Nume: <nume familie>
Prenume: <prenume>
Data nașterii: <ZZ.LL.AAAA>
Număr pașaport: <număr>
Data emitere: <ZZ.LL.AAAA>
Data expirare: <ZZ.LL.AAAA>
Naționalitate: Română

### Date buletin / CI
Când cere "date buletin", "CI", "act identitate" pentru o persoană:
Nume: <nume familie>
Prenume: <prenume>
Data nașterii: <ZZ.LL.AAAA>
Serie și număr: <serie + număr>
CNP: <cnp>
Data emitere: <ZZ.LL.AAAA>
Data expirare: <ZZ.LL.AAAA>

### Date pentru RCA (din talon + carte auto)
Când cere "date pentru RCA", "date talon pentru RCA", "completare RCA":
Număr înmatriculare: <plate>
Serie șasiu (VIN): <vin>
Marcă: <marca>
Model: <model>
An fabricație: <an din OCR>
Combustibil: <combustibil din OCR>
Capacitate cilindrică: <cm3 din OCR dacă există>
Putere: <kW/CP din OCR dacă există>

### IBAN / contact persoană
Când cere "IBAN", "cont bancar", "telefon", "email" pentru o persoană — returnează direct valoarea, fără explicații lungi.`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  return sendAiRequest(messages, 500);
}
