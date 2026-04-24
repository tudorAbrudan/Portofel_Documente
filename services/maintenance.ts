import { db, generateId } from './db';
import type { VehicleMaintenanceTask, MaintenancePresetKey, MaintenanceTaskStatus } from '@/types';

type Row = {
  id: string;
  vehicle_id: string;
  name: string;
  preset_key: string | null;
  trigger_km: number | null;
  trigger_months: number | null;
  last_done_km: number | null;
  last_done_date: string | null;
  note: string | null;
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToTask(r: Row): VehicleMaintenanceTask {
  return {
    id: r.id,
    vehicle_id: r.vehicle_id,
    name: r.name,
    preset_key: (r.preset_key as MaintenancePresetKey | null) ?? undefined,
    trigger_km: r.trigger_km ?? undefined,
    trigger_months: r.trigger_months ?? undefined,
    last_done_km: r.last_done_km ?? undefined,
    last_done_date: r.last_done_date ?? undefined,
    note: r.note ?? undefined,
    calendar_event_id: r.calendar_event_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function setMaintenanceCalendarEventId(
  id: string,
  eventId: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE vehicle_maintenance_tasks SET calendar_event_id = ?, updated_at = ? WHERE id = ?',
    [eventId, now, id]
  );
}

export async function getMaintenanceTask(id: string): Promise<VehicleMaintenanceTask | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM vehicle_maintenance_tasks WHERE id = ?', [
    id,
  ]);
  return row ? rowToTask(row) : null;
}

export async function getMaintenanceTasks(vehicleId: string): Promise<VehicleMaintenanceTask[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM vehicle_maintenance_tasks WHERE vehicle_id = ? ORDER BY created_at ASC',
    [vehicleId]
  );
  return rows.map(rowToTask);
}

export async function getAllMaintenanceTasks(): Promise<VehicleMaintenanceTask[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM vehicle_maintenance_tasks ORDER BY created_at ASC'
  );
  return rows.map(rowToTask);
}

export interface CreateMaintenanceInput {
  vehicle_id: string;
  name: string;
  preset_key?: MaintenancePresetKey;
  trigger_km?: number;
  trigger_months?: number;
  last_done_km?: number;
  last_done_date?: string;
  note?: string;
}

export async function createMaintenanceTask(
  input: CreateMaintenanceInput
): Promise<VehicleMaintenanceTask> {
  if (input.trigger_km == null && input.trigger_months == null) {
    throw new Error('Setează cel puțin un prag (km sau luni).');
  }
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO vehicle_maintenance_tasks
     (id, vehicle_id, name, preset_key, trigger_km, trigger_months, last_done_km, last_done_date, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.vehicle_id,
      input.name.trim(),
      input.preset_key ?? null,
      input.trigger_km ?? null,
      input.trigger_months ?? null,
      input.last_done_km ?? null,
      input.last_done_date ?? null,
      input.note?.trim() || null,
      now,
      now,
    ]
  );
  return {
    id,
    vehicle_id: input.vehicle_id,
    name: input.name.trim(),
    preset_key: input.preset_key,
    trigger_km: input.trigger_km,
    trigger_months: input.trigger_months,
    last_done_km: input.last_done_km,
    last_done_date: input.last_done_date,
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export type UpdateMaintenanceInput = Partial<Omit<CreateMaintenanceInput, 'vehicle_id'>>;

export async function updateMaintenanceTask(
  id: string,
  patch: UpdateMaintenanceInput
): Promise<void> {
  const existing = await db.getFirstAsync<Row>(
    'SELECT * FROM vehicle_maintenance_tasks WHERE id = ?',
    [id]
  );
  if (!existing) throw new Error('Task de mentenanță inexistent.');
  const merged = {
    name: patch.name?.trim() ?? existing.name,
    preset_key: patch.preset_key ?? existing.preset_key ?? null,
    trigger_km: patch.trigger_km ?? existing.trigger_km ?? null,
    trigger_months: patch.trigger_months ?? existing.trigger_months ?? null,
    last_done_km: patch.last_done_km ?? existing.last_done_km ?? null,
    last_done_date: patch.last_done_date ?? existing.last_done_date ?? null,
    note: patch.note?.trim() ?? existing.note ?? null,
  };
  if (merged.trigger_km == null && merged.trigger_months == null) {
    throw new Error('Task-ul trebuie să aibă cel puțin un prag (km sau luni).');
  }
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE vehicle_maintenance_tasks
     SET name = ?, preset_key = ?, trigger_km = ?, trigger_months = ?,
         last_done_km = ?, last_done_date = ?, note = ?, updated_at = ?
     WHERE id = ?`,
    [
      merged.name,
      merged.preset_key,
      merged.trigger_km,
      merged.trigger_months,
      merged.last_done_km,
      merged.last_done_date,
      merged.note,
      now,
      id,
    ]
  );
}

export async function markMaintenanceDone(
  id: string,
  doneKm?: number,
  doneDate?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE vehicle_maintenance_tasks SET last_done_km = ?, last_done_date = ?, updated_at = ? WHERE id = ?',
    [doneKm ?? null, doneDate ?? now, now, id]
  );
}

export async function deleteMaintenanceTask(id: string): Promise<void> {
  await db.runAsync('DELETE FROM vehicle_maintenance_tasks WHERE id = ?', [id]);
}

// Returnează cel mai mare km_total din fuel_records pentru vehicul (km-ul cunoscut cel mai recent).
// null dacă nu există înregistrări cu km.
export async function getCurrentKm(vehicleId: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ max_km: number | null }>(
    'SELECT MAX(km_total) as max_km FROM fuel_records WHERE vehicle_id = ? AND km_total IS NOT NULL',
    [vehicleId]
  );
  return row?.max_km ?? null;
}

// Warning = sub 10% rămas (sau sub 30 zile); Critical = atins sau depășit.
const WARNING_KM_RATIO = 0.1;
const WARNING_DAYS = 30;

export function computeTaskStatus(
  task: VehicleMaintenanceTask,
  currentKm: number | null
): MaintenanceTaskStatus {
  const now = new Date();

  let kmRemaining: number | undefined;
  let daysRemaining: number | undefined;

  if (task.trigger_km != null && currentKm != null) {
    const baseKm = task.last_done_km ?? 0;
    const nextKm = baseKm + task.trigger_km;
    kmRemaining = nextKm - currentKm;
  }

  if (task.trigger_months != null) {
    const base = task.last_done_date ? new Date(task.last_done_date) : new Date(task.createdAt);
    const nextDate = new Date(base);
    nextDate.setMonth(nextDate.getMonth() + task.trigger_months);
    const ms = nextDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  // Determină statusul pe baza celui mai strâns prag
  let status: MaintenanceTaskStatus['status'] = 'ok';
  let dueBy: MaintenanceTaskStatus['dueBy'];

  if (kmRemaining != null) {
    if (kmRemaining <= 0) {
      status = 'critical';
      dueBy = 'km';
    } else if (task.trigger_km && kmRemaining <= task.trigger_km * WARNING_KM_RATIO) {
      status = 'warning';
      dueBy = 'km';
    }
  }
  if (daysRemaining != null) {
    if (daysRemaining <= 0 && status !== 'critical') {
      status = 'critical';
      dueBy = 'date';
    } else if (daysRemaining > 0 && daysRemaining <= WARNING_DAYS && status === 'ok') {
      status = 'warning';
      dueBy = 'date';
    }
  }

  // Mesaj user-friendly
  const parts: string[] = [];
  if (kmRemaining != null) {
    if (kmRemaining > 0) {
      parts.push(`${kmRemaining.toLocaleString('ro-RO')} km rămași`);
    } else {
      parts.push(`depășit cu ${Math.abs(kmRemaining).toLocaleString('ro-RO')} km`);
    }
  } else if (task.trigger_km != null && currentKm == null) {
    parts.push(`la ${task.trigger_km.toLocaleString('ro-RO')} km (km actual necunoscut)`);
  }
  if (daysRemaining != null) {
    if (daysRemaining > 0) {
      parts.push(`${daysRemaining} zile`);
    } else if (daysRemaining === 0) {
      parts.push('astăzi');
    } else {
      parts.push(`depășit cu ${Math.abs(daysRemaining)} zile`);
    }
  }

  return {
    status,
    kmRemaining,
    daysRemaining,
    dueBy,
    dueMessage: parts.join(' · ') || 'Niciun prag activ',
  };
}
