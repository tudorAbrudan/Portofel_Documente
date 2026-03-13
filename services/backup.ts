import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as entities from './entities';
import * as docs from './documents';

export async function exportBackup(): Promise<void> {
  const [persons, properties, vehicles, cards, documents] = await Promise.all([
    entities.getPersons(),
    entities.getProperties(),
    entities.getVehicles(),
    entities.getCards(),
    docs.getDocuments(),
  ]);

  const payload = {
    version: 1,
    exportDate: new Date().toISOString(),
    persons,
    properties,
    vehicles,
    cards,
    documents,
  };

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `documente_backup_${date}.json`;
  const path = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Salvează backup',
    UTI: 'public.json',
  });
}

export interface ImportResult {
  imported: number;
  errors: string[];
}

export async function importBackup(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) throw new Error('Anulat');

  const uri = result.assets[0].uri;
  const json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const payload = JSON.parse(json);

  let imported = 0;
  const errors: string[] = [];

  const personMap = new Map<string, string>();
  const propertyMap = new Map<string, string>();
  const vehicleMap = new Map<string, string>();
  const cardMap = new Map<string, string>();

  for (const p of payload.persons ?? []) {
    try {
      const created = await entities.createPerson(p.name || 'Persoană');
      if (p.id) personMap.set(p.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Persoană "${p.name}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const pr of payload.properties ?? []) {
    try {
      const created = await entities.createProperty(pr.name || 'Proprietate');
      if (pr.id) propertyMap.set(pr.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Proprietate "${pr.name}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const v of payload.vehicles ?? []) {
    try {
      const created = await entities.createVehicle(v.name || 'Vehicul');
      if (v.id) vehicleMap.set(v.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Vehicul "${v.name}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const c of payload.cards ?? []) {
    try {
      const created = await entities.createCard(c.nickname || 'Card', c.last4 || '****', c.expiry);
      if (c.id) cardMap.set(c.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Card "${c.nickname}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const d of payload.documents ?? []) {
    try {
      await docs.createDocument({
        type: d.type,
        issue_date: d.issue_date || undefined,
        expiry_date: d.expiry_date || undefined,
        note: d.note || undefined,
        file_path: d.file_path || undefined,
        person_id: d.person_id ? personMap.get(d.person_id) : undefined,
        property_id: d.property_id ? propertyMap.get(d.property_id) : undefined,
        vehicle_id: d.vehicle_id ? vehicleMap.get(d.vehicle_id) : undefined,
        card_id: d.card_id ? cardMap.get(d.card_id) : undefined,
      });
      imported++;
    } catch (e) {
      errors.push(`Document "${d.type}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  return { imported, errors };
}
