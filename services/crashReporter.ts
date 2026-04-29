import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface NativeCrashReport {
  name: string;
  reason: string;
  userInfo: Record<string, string>;
  callStackSymbols: string[];
  callStackReturnAddresses: string[];
  timestamp: string;
  appVersion: string;
  buildNumber: string;
}

const CRASH_FILE = 'last_crash.json';

function crashFileUri(): string | null {
  if (Platform.OS !== 'ios') return null;
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}${CRASH_FILE}`;
}

export async function getLastCrash(): Promise<NativeCrashReport | null> {
  const uri = crashFileUri();
  if (!uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(raw) as Partial<NativeCrashReport>;
    if (typeof parsed.name !== 'string' || typeof parsed.timestamp !== 'string') {
      return null;
    }
    return {
      name: parsed.name,
      reason: parsed.reason ?? '',
      userInfo: parsed.userInfo ?? {},
      callStackSymbols: parsed.callStackSymbols ?? [],
      callStackReturnAddresses: parsed.callStackReturnAddresses ?? [],
      timestamp: parsed.timestamp,
      appVersion: parsed.appVersion ?? 'unknown',
      buildNumber: parsed.buildNumber ?? 'unknown',
    };
  } catch {
    return null;
  }
}

export async function clearLastCrash(): Promise<void> {
  const uri = crashFileUri();
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignor — fișierul poate să nu existe
  }
}

export function formatCrashForClipboard(crash: NativeCrashReport): string {
  const userInfoLines = Object.entries(crash.userInfo)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  return [
    `Dosar — Crash report`,
    `Versiune: ${crash.appVersion} (build ${crash.buildNumber})`,
    `Data: ${crash.timestamp}`,
    `Tip: ${crash.name}`,
    `Motiv: ${crash.reason || '(fără mesaj)'}`,
    userInfoLines ? `userInfo:\n${userInfoLines}` : '',
    `Stack:`,
    ...crash.callStackSymbols,
    ``,
    `Adrese return:`,
    ...crash.callStackReturnAddresses,
  ]
    .filter(Boolean)
    .join('\n');
}
