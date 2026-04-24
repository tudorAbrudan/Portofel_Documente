import { db } from './db';
import type { EntityType } from '@/types';

export interface EntityRef {
  entity_type: EntityType;
  entity_id: string;
}

const STEP = 1000;

/**
 * Atribuie un sort_order pentru o entitate nou creată.
 * Valoarea = MIN(sort_order) - STEP, așa încât noile entități apar în TOP-ul listei
 * (respectă UX-ul anterior: „nou creat → imediat vizibil").
 */
export async function assignNextOrder(entity_type: EntityType, entity_id: string): Promise<void> {
  const row = await db.getFirstAsync<{ minOrder: number | null }>(
    'SELECT MIN(sort_order) AS minOrder FROM entity_order'
  );
  const next = (row?.minOrder ?? STEP) - STEP;
  await db.runAsync(
    'INSERT OR REPLACE INTO entity_order (entity_type, entity_id, sort_order) VALUES (?, ?, ?)',
    [entity_type, entity_id, next]
  );
}

/**
 * Elimină o entitate din ordinea globală (apelat la ștergere).
 */
export async function removeOrder(entity_type: EntityType, entity_id: string): Promise<void> {
  await db.runAsync('DELETE FROM entity_order WHERE entity_type = ? AND entity_id = ?', [
    entity_type,
    entity_id,
  ]);
}

/**
 * Returnează o hartă completă a sort_order-urilor globale.
 * Cheia e `${entity_type}:${entity_id}` iar valoarea e `sort_order`.
 * Folosit de UI pentru a sorta liste cross-type (tab-ul „Toate").
 */
export async function getGlobalOrderMap(): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{
    entity_type: EntityType;
    entity_id: string;
    sort_order: number;
  }>('SELECT entity_type, entity_id, sort_order FROM entity_order');
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(`${r.entity_type}:${r.entity_id}`, r.sort_order);
  }
  return map;
}

/**
 * Aplică o ordine globală nouă pentru lista dată.
 * Renumerotează sort_order ca STEP, 2·STEP, 3·STEP, ... într-o singură tranzacție.
 * Entitățile neincluse în listă își păstrează valoarea existentă; de obicei apelantul
 * trimite lista completă (a se vedea useEntities.reorder).
 */
export async function setGlobalOrder(list: EntityRef[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < list.length; i++) {
      const { entity_type, entity_id } = list[i];
      const sort_order = (i + 1) * STEP;
      await db.runAsync(
        'INSERT OR REPLACE INTO entity_order (entity_type, entity_id, sort_order) VALUES (?, ?, ?)',
        [entity_type, entity_id, sort_order]
      );
    }
  });
}
