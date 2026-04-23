import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

export const REVIEW_PROMPT_EVENT = 'review_prompt_show';

const KEY_INSTALL_DATE = 'review_install_date';
const KEY_SESSION_DAYS = 'review_session_days';
const KEY_LAST_PROMPT_AT = 'review_last_prompt_at';
const KEY_SENTIMENT = 'review_sentiment';
const KEY_DOC_MILESTONE_HIT = 'review_doc_milestone_hit';

const MIN_DAYS_SINCE_INSTALL = 7;
const MIN_SESSION_DAYS = 3;
const MIN_DAYS_BETWEEN_PROMPTS = 120;
const DOC_MILESTONE_COUNT = 3;
const RENEWAL_ALERT_WINDOW_DAYS = 30;
const RENEWAL_MIN_FUTURE_DAYS = 30;
const SHOW_DELAY_MS = 1500;

const FEEDBACK_EMAIL = 'apps.tudor@gmail.com';

export type ReviewSentiment = 'positive' | 'negative';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

async function readSessionDays(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY_SESSION_DAYS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Înregistrează ziua curentă ca sesiune și setează `install_date` la prima apelare.
 * Se apelează din root layout la pornirea app-ului.
 */
export async function recordAppOpen(): Promise<void> {
  const today = todayIso();

  const install = await AsyncStorage.getItem(KEY_INSTALL_DATE);
  if (!install) {
    await AsyncStorage.setItem(KEY_INSTALL_DATE, today);
  }

  const days = await readSessionDays();
  if (!days.includes(today)) {
    const updated = [...days, today].slice(-30);
    await AsyncStorage.setItem(KEY_SESSION_DAYS, JSON.stringify(updated));
  }
}

/**
 * Verifică dacă toate gate-urile sunt trecute. Dacă da, emite eveniment
 * care va afișa modalul (cu delay, ca utilizatorul să vadă confirmarea).
 */
async function maybeTrigger(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const sentiment = await AsyncStorage.getItem(KEY_SENTIMENT);
  if (sentiment === 'positive' || sentiment === 'negative') return;

  const installDate = await AsyncStorage.getItem(KEY_INSTALL_DATE);
  if (!installDate) return;
  if (daysBetween(installDate, todayIso()) < MIN_DAYS_SINCE_INSTALL) return;

  const sessionDays = await readSessionDays();
  if (sessionDays.length < MIN_SESSION_DAYS) return;

  const lastPromptAt = await AsyncStorage.getItem(KEY_LAST_PROMPT_AT);
  if (lastPromptAt) {
    const daysAgo = daysBetween(lastPromptAt.slice(0, 10), todayIso());
    if (daysAgo < MIN_DAYS_BETWEEN_PROMPTS) return;
  }

  setTimeout(() => {
    DeviceEventEmitter.emit(REVIEW_PROMPT_EVENT);
  }, SHOW_DELAY_MS);
}

/**
 * Trigger #1 — utilizatorul a reînnoit un document ce era expirat sau aproape să expire.
 * Peak emoțional: app-ul tocmai l-a salvat de o amendă/lapsă.
 */
export async function onDocumentRenewed(params: {
  oldExpiry: string | null | undefined;
  newExpiry: string | null | undefined;
}): Promise<void> {
  const { oldExpiry, newExpiry } = params;
  if (!oldExpiry || !newExpiry) return;

  const today = todayIso();
  const daysUntilOld = daysBetween(today, oldExpiry);
  const daysUntilNew = daysBetween(today, newExpiry);

  const wasAtRisk = daysUntilOld <= RENEWAL_ALERT_WINDOW_DAYS;
  const isNowRenewed = daysUntilNew >= RENEWAL_MIN_FUTURE_DAYS;

  if (wasAtRisk && isNowRenewed) {
    await maybeTrigger();
  }
}

/**
 * Trigger #2 — utilizatorul a făcut restore cu succes.
 * Peak emoțional: „uf, nu mi-am pierdut datele".
 */
export async function onRestoreSuccess(imported: number): Promise<void> {
  if (imported <= 0) return;
  await maybeTrigger();
}

/**
 * Trigger #3 — al 3-lea document adăugat (milestone de engagement).
 * Se declanșează o singură dată pe device.
 */
export async function onDocumentCreated(totalCount: number): Promise<void> {
  if (totalCount < DOC_MILESTONE_COUNT) return;
  const already = await AsyncStorage.getItem(KEY_DOC_MILESTONE_HIT);
  if (already === 'true') return;
  await AsyncStorage.setItem(KEY_DOC_MILESTONE_HIT, 'true');
  await maybeTrigger();
}

/**
 * Utilizatorul a spus că îi place → afișează prompt-ul nativ App Store / Play Store.
 * Marchează sentiment='positive' înainte (nu mai întrebăm niciodată, indiferent dacă
 * prompt-ul nativ a fost efectiv afișat — Apple poate să-l throttle-uiască).
 */
export async function handlePositiveSentiment(): Promise<void> {
  await AsyncStorage.setItem(KEY_SENTIMENT, 'positive');
  await AsyncStorage.setItem(KEY_LAST_PROMPT_AT, new Date().toISOString());
  try {
    const available = await StoreReview.isAvailableAsync();
    if (available) {
      await StoreReview.requestReview();
    }
  } catch {
    // Prompt-ul nativ a eșuat — sentimentul e deja salvat, nu mai întrebăm.
  }
}

/**
 * Utilizatorul nu e 100% mulțumit → deschide mailto cu template feedback.
 * Nu-l trimitem pe App Store (evităm review negativ public).
 */
export async function handleNegativeSentiment(): Promise<void> {
  await AsyncStorage.setItem(KEY_SENTIMENT, 'negative');
  await AsyncStorage.setItem(KEY_LAST_PROMPT_AT, new Date().toISOString());

  const subject = encodeURIComponent('Feedback Dosar');
  const body = encodeURIComponent(
    'Salut,\n\nCe mi-ar plăcea să fie mai bine în Dosar:\n\n\n' +
      '— Platformă: ' +
      Platform.OS +
      '\n'
  );
  try {
    await Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`);
  } catch {
    // Mailto nedisponibil — sentimentul e salvat, nu mai întrebăm.
  }
}

/**
 * Utilizatorul a amânat → actualizează `last_prompt_at` (reîncercăm peste 120 zile).
 */
export async function handlePostponeSentiment(): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_PROMPT_AT, new Date().toISOString());
}
