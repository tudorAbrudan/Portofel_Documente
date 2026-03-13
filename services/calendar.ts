import { Platform } from 'react-native';
import { DOCUMENT_TYPE_LABELS } from '@/types';
import type { DocumentType } from '@/types';

// expo-calendar necesită build nativ (expo prebuild + expo run:ios).
// Importăm cu require pentru a nu crăpa app-ul dacă modulul nativ nu e linkat.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CalendarModule = (() => { try { return require('expo-calendar'); } catch { return null; } })();

const REMINDER_DAYS_BEFORE = 14;

const ASIGRA_URL = 'https://asigra.ro';

/** Tipuri pentru care afișăm link-ul asigra.ro */
const ASIGRA_TYPES: Partial<Record<DocumentType, string>> = {
  rca: ASIGRA_URL,
  casco: ASIGRA_URL,
  itp: ASIGRA_URL,
};

async function getDefaultCalendarId(): Promise<string | null> {
  if (!CalendarModule) return null;

  const { status } = await CalendarModule.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  const calendars: Array<{
    id: string;
    allowsModifications: boolean;
    accessLevel?: string;
    source?: { name?: string; isLocalAccount?: boolean };
  }> = await CalendarModule.getCalendarsAsync(CalendarModule.EntityTypes.EVENT);

  if (Platform.OS === 'ios') {
    const icloud = calendars.find(c => c.source?.name === 'iCloud' && c.allowsModifications);
    const local = calendars.find(c => c.source?.isLocalAccount && c.allowsModifications);
    return (icloud ?? local ?? calendars.find(c => c.allowsModifications))?.id ?? null;
  }

  const google = calendars.find(c => c.accessLevel === 'owner' && c.allowsModifications);
  return (google ?? calendars.find(c => c.allowsModifications))?.id ?? null;
}

export interface CalendarEventOptions {
  docType: DocumentType;
  expiryDate: string; // AAAA-LL-ZZ
  entityName?: string;
}

/**
 * Adaugă un eveniment în calendar cu reminder cu 14 zile înainte de expirare.
 * Pentru RCA și ITP include link asigra.ro în descriere.
 * Returnează ID-ul evenimentului sau null dacă calendarul nu e disponibil.
 */
export async function addExpiryCalendarEvent(opts: CalendarEventOptions): Promise<string | null> {
  if (!CalendarModule) return null;

  try {
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) return null;

    const typeLabel = DOCUMENT_TYPE_LABELS[opts.docType] ?? opts.docType;
    const title = opts.entityName
      ? `Expiră ${typeLabel} – ${opts.entityName}`
      : `Expiră ${typeLabel}`;

    const asigraUrl = ASIGRA_TYPES[opts.docType];
    const notes = [
      `${typeLabel} expiră pe ${opts.expiryDate}.`,
      asigraUrl ? `Compară oferte: ${asigraUrl}` : null,
      'Adăugat automat de Portofel Documente.',
    ].filter(Boolean).join('\n');

    const [year, month, day] = opts.expiryDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 9, 0, 0);
    const endDate = new Date(year, month - 1, day, 10, 0, 0);

    const eventId = await CalendarModule.createEventAsync(calendarId, {
      title,
      notes,
      startDate,
      endDate,
      alarms: [{ relativeOffset: -REMINDER_DAYS_BEFORE * 24 * 60 }],
      timeZone: 'Europe/Bucharest',
    });
    return eventId ?? null;
  } catch {
    return null;
  }
}

/** Returnează true dacă modulul nativ de calendar e disponibil (build nativ, nu Expo Go) */
export function isCalendarAvailable(): boolean {
  return CalendarModule !== null;
}
