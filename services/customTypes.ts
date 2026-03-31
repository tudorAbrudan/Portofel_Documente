import { db, generateId } from './db';
import type { CustomDocumentType } from '@/types';

export async function getCustomTypes(): Promise<CustomDocumentType[]> {
  return db.getAllAsync<CustomDocumentType>(
    'SELECT * FROM custom_document_types ORDER BY created_at ASC'
  );
}

export async function createCustomType(name: string): Promise<CustomDocumentType> {
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync('INSERT INTO custom_document_types (id, name, created_at) VALUES (?, ?, ?)', [
    id,
    name.trim(),
    created_at,
  ]);
  return { id, name: name.trim(), created_at };
}

export async function deleteCustomType(id: string): Promise<void> {
  await db.runAsync('DELETE FROM custom_document_types WHERE id = ?', [id]);
}
