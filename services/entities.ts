import { db, generateId } from './db';
import type { Person, Property, Vehicle, Card } from '@/types';

export async function getPersons(): Promise<Person[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; created_at: string }>(
    'SELECT id, name, created_at FROM persons ORDER BY created_at DESC'
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function getProperties(): Promise<Property[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; created_at: string }>(
    'SELECT id, name, created_at FROM properties ORDER BY created_at DESC'
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function getVehicles(): Promise<Vehicle[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; created_at: string }>(
    'SELECT id, name, created_at FROM vehicles ORDER BY created_at DESC'
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function getCards(): Promise<Card[]> {
  const rows = await db.getAllAsync<{
    id: string;
    nickname: string;
    last4: string;
    expiry: string | null;
    created_at: string;
  }>('SELECT id, nickname, last4, expiry, created_at FROM cards ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    nickname: r.nickname,
    last4: r.last4,
    expiry: r.expiry ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function createPerson(name: string): Promise<Person> {
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync('INSERT INTO persons (id, name, created_at) VALUES (?, ?, ?)', [id, name, created_at]);
  return { id, name, createdAt: created_at };
}

export async function createProperty(name: string): Promise<Property> {
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync('INSERT INTO properties (id, name, created_at) VALUES (?, ?, ?)', [id, name, created_at]);
  return { id, name, createdAt: created_at };
}

export async function createVehicle(name: string): Promise<Vehicle> {
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync('INSERT INTO vehicles (id, name, created_at) VALUES (?, ?, ?)', [id, name, created_at]);
  return { id, name, createdAt: created_at };
}

export async function createCard(nickname: string, last4: string, expiry?: string): Promise<Card> {
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO cards (id, nickname, last4, expiry, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, nickname, last4, expiry ?? null, created_at]
  );
  return { id, nickname, last4, expiry, createdAt: created_at };
}

export async function updatePerson(id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE persons SET name = ? WHERE id = ?', [name, id]);
}

export async function updateProperty(id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE properties SET name = ? WHERE id = ?', [name, id]);
}

export async function updateVehicle(id: string, name: string): Promise<void> {
  await db.runAsync('UPDATE vehicles SET name = ? WHERE id = ?', [name, id]);
}

export async function updateCard(id: string, nickname: string, last4: string, expiry?: string): Promise<void> {
  await db.runAsync(
    'UPDATE cards SET nickname = ?, last4 = ?, expiry = ? WHERE id = ?',
    [nickname, last4, expiry ?? null, id]
  );
}

export async function deletePerson(id: string): Promise<void> {
  await db.runAsync('DELETE FROM persons WHERE id = ?', [id]);
}

export async function deleteProperty(id: string): Promise<void> {
  await db.runAsync('DELETE FROM properties WHERE id = ?', [id]);
}

export async function deleteVehicle(id: string): Promise<void> {
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', [id]);
}

export async function deleteCard(id: string): Promise<void> {
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}
