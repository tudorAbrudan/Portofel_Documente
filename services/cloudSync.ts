import { db } from './db';
import * as cloudStorage from './cloudStorage';
import { buildCanonicalManifest, hashManifestAsync } from './manifestHash';
import * as entities from './entities';
import * as docs from './documents';
import * as fuel from './fuel';
import { getCustomTypes } from './customTypes';
import type { CloudManifestMeta, EntityType } from '@/types';

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
  for (const [key, value] of Object.entries(patch)) {
    fields.push(`${key} = ?`);
    values.push(value as string | number | null);
  }
  if (!fields.length) return;
  await db.runAsync(`UPDATE cloud_state SET ${fields.join(', ')} WHERE id = 1`, values);
}

async function buildManifestPayload(): Promise<Record<string, unknown>> {
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
 */
export async function uploadManifestIfChanged(): Promise<boolean> {
  if (!(await cloudStorage.isAvailable())) return false;

  const payload = await buildManifestPayload();
  const canonical = buildCanonicalManifest(payload);
  const hash = await hashManifestAsync(canonical);

  const state = await getCloudState();
  if (state.last_manifest_hash === hash) {
    return false;
  }

  const json = JSON.stringify(payload);
  await cloudStorage.writeFile(MANIFEST_PATH, json, 'utf8');

  const documentsList = payload.documents as { file_path?: string }[];
  const pagesList = payload.documentPages as unknown[];
  const documentCount = documentsList.length;
  const fileCount = documentsList.filter(d => d.file_path).length + pagesList.length;
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
