import * as FileSystem from 'expo-file-system/legacy';
import { db } from './db';
import * as cloudStorage from './cloudStorage';
import { buildCanonicalManifest, hashManifestAsync } from './manifestHash';
import * as entities from './entities';
import * as docs from './documents';
import * as fuel from './fuel';
import { getCustomTypes } from './customTypes';
import { toFileUri } from './fileUtils';
import type {
  Animal,
  Card,
  CloudManifestMeta,
  Company,
  CustomDocumentType,
  Document,
  DocumentPage,
  EntityType,
  FuelRecord,
  Person,
  Property,
  Vehicle,
} from '@/types';

const CLOUD_ROOT = 'Dosar';
const MANIFEST_PATH = `${CLOUD_ROOT}/manifest.json`;
const META_PATH = `${CLOUD_ROOT}/manifest.meta.json`;
const MANIFEST_VERSION = 1;

interface CloudState {
  last_manifest_hash: string | null;
  last_manifest_uploaded_at: number | null;
  last_snapshot_at: number | null;
  device_id: string;
}

export async function getCloudState(): Promise<CloudState> {
  const row = await db.getFirstAsync<CloudState>(
    'SELECT last_manifest_hash, last_manifest_uploaded_at, last_snapshot_at, device_id FROM cloud_state WHERE id = 1'
  );
  if (!row) throw new Error('cloud_state not initialized');
  return row;
}

export async function setCloudState(patch: Partial<CloudState>): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const key of Object.keys(patch) as (keyof CloudState)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (!fields.length) return;
  await db.runAsync(`UPDATE cloud_state SET ${fields.join(', ')} WHERE id = 1`, values);
}

interface ManifestPayload {
  version: number;
  exportDate: string;
  persons: Person[];
  properties: Property[];
  vehicles: Vehicle[];
  cards: Card[];
  animals: Animal[];
  companies: Company[];
  fuelRecords: FuelRecord[];
  customTypes: CustomDocumentType[];
  documents: Document[];
  documentPages: DocumentPage[];
  entityOrder: { entity_type: EntityType; entity_id: string; sort_order: number }[];
}

async function buildManifestPayload(): Promise<ManifestPayload> {
  const [
    persons,
    properties,
    vehicles,
    cards,
    animals,
    companies,
    fuelRecords,
    documents,
    allPages,
    customTypes,
    entityOrder,
  ] = await Promise.all([
    entities.getPersons(),
    entities.getProperties(),
    entities.getVehicles(),
    entities.getCards(),
    entities.getAnimals(),
    entities.getCompanies(),
    fuel.getAllFuelRecords(),
    docs.getDocuments(),
    docs.getAllDocumentPages(),
    getCustomTypes(),
    db.getAllAsync<{ entity_type: EntityType; entity_id: string; sort_order: number }>(
      'SELECT entity_type, entity_id, sort_order FROM entity_order'
    ),
  ]);

  return {
    version: MANIFEST_VERSION,
    exportDate: new Date().toISOString(),
    persons,
    properties,
    vehicles,
    cards,
    animals,
    companies,
    fuelRecords,
    customTypes,
    documents,
    documentPages: allPages,
    entityOrder,
  };
}

/**
 * Compară hash-ul manifestului curent cu ultimul uploadat. Dacă diferă, urcă manifest + meta.
 * Returnează true dacă a făcut upload, false dacă skip (no changes).
 *
 * @throws când iCloud devine indisponibil între `isAvailable()` și `writeFile`,
 *   sau când scrierea/serializarea eșuează. Apelantul (Task 11) este responsabil
 *   să prindă și să decidă retry vs. logging.
 */
export async function uploadManifestIfChanged(): Promise<boolean> {
  if (!(await cloudStorage.isAvailable())) return false;

  const payload = await buildManifestPayload();
  const canonical = buildCanonicalManifest(payload as unknown as Record<string, unknown>);
  const hash = await hashManifestAsync(canonical);

  const state = await getCloudState();
  if (state.last_manifest_hash === hash) {
    return false;
  }

  const json = JSON.stringify(payload);
  await cloudStorage.writeFile(MANIFEST_PATH, json, 'utf8');

  const documentCount = payload.documents.length;
  const fileCount =
    payload.documents.filter(d => d.file_path).length + payload.documentPages.length;
  const meta: CloudManifestMeta = {
    version: MANIFEST_VERSION,
    uploadedAt: Date.now(),
    hash,
    deviceId: state.device_id,
    encrypted: false,
    documentCount,
    fileCount,
  };
  await cloudStorage.writeFile(META_PATH, JSON.stringify(meta), 'utf8');

  await setCloudState({
    last_manifest_hash: hash,
    last_manifest_uploaded_at: meta.uploadedAt,
  });

  return true;
}

export async function readCloudMeta(): Promise<CloudManifestMeta | null> {
  if (!(await cloudStorage.isAvailable())) return null;
  if (!(await cloudStorage.exists(META_PATH))) return null;
  try {
    const text = await cloudStorage.readFile(META_PATH, 'utf8');
    return JSON.parse(text) as CloudManifestMeta;
  } catch {
    return null;
  }
}

// TODO(task-9): namespace remote paths by document_id if filenames ever collide.
// Today file_path is `documents/<UUID>.<ext>` so basename is collision-safe.
const FILES_PREFIX = `${CLOUD_ROOT}/files/`;
const MAX_ATTEMPTS = 5;

function fileNameFromPath(relPath: string): string {
  return relPath.split('/').pop() ?? relPath;
}

/**
 * Adaugă un fișier în coada de upload. Idempotent — re-enqueue resetează
 * `attempt_count` și `last_error` (`ON CONFLICT` pe `file_path`).
 *
 * @throws când scrierea în SQLite eșuează (rar — DB locală).
 */
export async function enqueueFileUpload(filePath: string): Promise<void> {
  if (!filePath) return;
  await db.runAsync(
    `INSERT INTO pending_uploads (file_path, attempt_count, created_at)
     VALUES (?, 0, ?)
     ON CONFLICT(file_path) DO UPDATE SET
       attempt_count = 0,
       last_error = NULL,
       created_at = excluded.created_at`,
    [filePath, Date.now()]
  );
}

/**
 * Scoate un fișier din coadă (dacă era pending) și încearcă să-l șteargă din cloud
 * (dacă era deja uploadat). Erorile remote sunt înghițite (eventual consistency).
 *
 * @throws când scrierea în SQLite eșuează.
 */
export async function dequeueFileDelete(filePath: string): Promise<void> {
  if (!filePath) return;
  await db.runAsync('DELETE FROM pending_uploads WHERE file_path = ?', [filePath]);
  if (await cloudStorage.isAvailable()) {
    const remote = `${FILES_PREFIX}${fileNameFromPath(filePath)}`;
    try {
      await cloudStorage.deleteFile(remote);
    } catch {
      // ignore — eventual consistency
    }
  }
}

/**
 * Procesează coada secvențial: citește pending rows cu `attempt_count < MAX_ATTEMPTS`,
 * urcă base64 în iCloud. Per-rând: succes → DELETE; eroare → bump `attempt_count` + `last_error`.
 *
 * Apelată fire-and-forget din hooks `documents.ts`. Erorile per-fișier sunt
 * persistate în `pending_uploads.last_error` și nu sunt aruncate.
 *
 * @throws când SELECT-ul inițial eșuează sau când UPDATE-ul de bookkeeping
 *   pentru un eșec nu poate fi scris (ambele indică o problemă cu SQLite).
 */
export async function processQueue(): Promise<void> {
  if (!(await cloudStorage.isAvailable())) return;

  const pending = await db.getAllAsync<{ id: number; file_path: string; attempt_count: number }>(
    'SELECT id, file_path, attempt_count FROM pending_uploads WHERE attempt_count < ? ORDER BY id ASC',
    [MAX_ATTEMPTS]
  );

  for (const row of pending) {
    try {
      const localUri = toFileUri(row.file_path);
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        await db.runAsync('DELETE FROM pending_uploads WHERE id = ?', [row.id]);
        continue;
      }
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const remote = `${FILES_PREFIX}${fileNameFromPath(row.file_path)}`;
      await cloudStorage.writeFile(remote, base64, 'base64');
      await db.runAsync('DELETE FROM pending_uploads WHERE id = ?', [row.id]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Eroare necunoscută';
      await db.runAsync(
        'UPDATE pending_uploads SET attempt_count = attempt_count + 1, last_error = ? WHERE id = ?',
        [message, row.id]
      );
    }
  }
}

/** Numărul de fișiere în coadă active (`attempt_count < MAX_ATTEMPTS`). */
export async function getPendingCount(): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM pending_uploads WHERE attempt_count < ?',
    [MAX_ATTEMPTS]
  );
  return row?.c ?? 0;
}

/** Numărul de fișiere care au atins `MAX_ATTEMPTS` și nu mai sunt re-încercate. */
export async function getFailedCount(): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM pending_uploads WHERE attempt_count >= ?',
    [MAX_ATTEMPTS]
  );
  return row?.c ?? 0;
}
