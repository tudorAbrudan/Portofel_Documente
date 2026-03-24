import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as entities from './entities';
import * as docs from './documents';
import { getCustomTypes, createCustomType } from './customTypes';
import { toFileUri, toRelativePath } from './fileUtils';

/**
 * Citește un fișier ca base64. Returnează null dacă nu există sau nu poate fi citit.
 */
async function readFileBase64(storedPath: string): Promise<string | null> {
  try {
    const uri = toFileUri(storedPath);
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    return null;
  }
}

export async function exportBackup(): Promise<void> {
  const [persons, properties, vehicles, cards, animals, companies, documents, allPages, customTypes] =
    await Promise.all([
      entities.getPersons(),
      entities.getProperties(),
      entities.getVehicles(),
      entities.getCards(),
      entities.getAnimals(),
      entities.getCompanies(),
      docs.getDocuments(),
      docs.getAllDocumentPages(),
      getCustomTypes(),
    ]);

  // Colectează toate imaginile ca base64 (cheie = path relativ stocat în DB)
  const images: Record<string, string> = {};

  for (const doc of documents) {
    if (doc.file_path) {
      const b64 = await readFileBase64(doc.file_path);
      if (b64) {
        images[toRelativePath(doc.file_path)] = b64;
      }
    }
  }
  for (const page of allPages) {
    if (page.file_path) {
      const b64 = await readFileBase64(page.file_path);
      if (b64) {
        images[toRelativePath(page.file_path)] = b64;
      }
    }
  }

  const payload = {
    version: 3,
    exportDate: new Date().toISOString(),
    persons,
    properties,
    vehicles,
    cards,
    animals,
    companies,
    customTypes,
    documents,
    documentPages: allPages,
    images,
  };

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `acte_backup_${date}.json`;
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

  if (!result || result.canceled || !result.assets || result.assets.length === 0) {
    throw new Error('Anulat');
  }

  const uri = result.assets[0].uri;
  const json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const payload = JSON.parse(json);

  // Pasul 1: Restaurare imagini (version 3+)
  if (payload.images && typeof payload.images === 'object') {
    const dir = `${FileSystem.documentDirectory}documents`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    for (const [relativePath, base64] of Object.entries(payload.images as Record<string, string>)) {
      try {
        const dest = `${FileSystem.documentDirectory}${relativePath}`;
        await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
      } catch {
        // Skip imagini care nu pot fi restaurate
      }
    }
  }

  let imported = 0;
  const errors: string[] = [];

  const personMap = new Map<string, string>();
  const propertyMap = new Map<string, string>();
  const vehicleMap = new Map<string, string>();
  const cardMap = new Map<string, string>();
  const animalMap = new Map<string, string>();
  const companyMap = new Map<string, string>();
  const customTypeMap = new Map<string, string>();
  const docIdMap = new Map<string, string>(); // old ID → new ID

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

  for (const a of payload.animals ?? []) {
    try {
      const created = await entities.createAnimal(a.name || 'Animal', a.species || '');
      if (a.id) animalMap.set(a.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Animal "${a.name}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const co of payload.companies ?? []) {
    try {
      const created = await entities.createCompany(co.name || 'Firmă', co.cui, co.reg_com);
      if (co.id) companyMap.set(co.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Firmă "${co.name}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const ct of payload.customTypes ?? []) {
    try {
      const created = await createCustomType(ct.name || 'Tip');
      if (ct.id) customTypeMap.set(ct.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Tip personalizat "${ct.name}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  for (const d of payload.documents ?? []) {
    try {
      // Normalizează file_path la relativ (pentru backupuri vechi cu path-uri absolute)
      const filePath = d.file_path ? toRelativePath(d.file_path) : undefined;
      const created = await docs.createDocument({
        type: d.type,
        custom_type_id: d.custom_type_id ? (customTypeMap.get(d.custom_type_id) ?? undefined) : undefined,
        issue_date: d.issue_date || undefined,
        expiry_date: d.expiry_date || undefined,
        note: d.note || undefined,
        file_path: filePath || undefined,
        ocr_text: d.ocr_text || undefined,
        metadata: d.metadata || undefined,
        person_id: d.person_id ? personMap.get(d.person_id) : undefined,
        property_id: d.property_id ? propertyMap.get(d.property_id) : undefined,
        vehicle_id: d.vehicle_id ? vehicleMap.get(d.vehicle_id) : undefined,
        card_id: d.card_id ? cardMap.get(d.card_id) : undefined,
        animal_id: d.animal_id ? animalMap.get(d.animal_id) : undefined,
        company_id: d.company_id ? companyMap.get(d.company_id) : undefined,
      });
      if (d.id) docIdMap.set(d.id, created.id);
      imported++;
    } catch (e) {
      errors.push(`Document "${d.type}": ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  // Restaurare pagini suplimentare (document_pages)
  for (const page of payload.documentPages ?? []) {
    try {
      if (!page.document_id || !page.file_path) continue;
      const newDocId = docIdMap.get(page.document_id);
      if (!newDocId) continue;
      const filePath = toRelativePath(page.file_path);
      await docs.addDocumentPage(newDocId, filePath);
      imported++;
    } catch (e) {
      errors.push(`Pagina document: ${e instanceof Error ? e.message : 'eroare'}`);
    }
  }

  return { imported, errors };
}
