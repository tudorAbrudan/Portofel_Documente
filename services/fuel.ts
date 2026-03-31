import { db, generateId } from './db';

export interface FuelRecord {
  id: string;
  vehicle_id: string;
  date: string; // AAAA-LL-ZZ
  liters?: number;
  km_total?: number;
  price?: number;
  created_at: string;
}

export interface VehicleFuelSettings {
  vehicle_id: string;
  service_km_interval: number; // km între revizii, default 10000
  last_service_km?: number;
  last_service_date?: string;
}

export interface FuelStats {
  totalRecords: number;
  avgConsumptionL100?: number; // L/100km calculat din ultimele înregistrări
  totalLiters: number;
  totalCost: number;
  latestKm?: number; // cel mai recent km_total
  needsService: boolean; // km_total > last_service_km + service_km_interval
  kmUntilService?: number; // câți km mai sunt până la revizie (negativ = depășit)
}

type FuelRow = {
  id: string;
  vehicle_id: string;
  date: string;
  liters: number | null;
  km_total: number | null;
  price: number | null;
  created_at: string;
};

type SettingsRow = {
  vehicle_id: string;
  service_km_interval: number;
  last_service_km: number | null;
  last_service_date: string | null;
};

function mapRecord(r: FuelRow): FuelRecord {
  return {
    id: r.id,
    vehicle_id: r.vehicle_id,
    date: r.date,
    liters: r.liters ?? undefined,
    km_total: r.km_total ?? undefined,
    price: r.price ?? undefined,
    created_at: r.created_at,
  };
}

export async function getFuelRecords(vehicleId: string): Promise<FuelRecord[]> {
  const rows = await db.getAllAsync<FuelRow>(
    'SELECT * FROM fuel_records WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC',
    [vehicleId]
  );
  return rows.map(mapRecord);
}

export async function addFuelRecord(
  vehicleId: string,
  record: { date: string; liters?: number; km_total?: number; price?: number }
): Promise<FuelRecord> {
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO fuel_records (id, vehicle_id, date, liters, km_total, price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      vehicleId,
      record.date,
      record.liters ?? null,
      record.km_total ?? null,
      record.price ?? null,
      created_at,
    ]
  );
  return { id, vehicle_id: vehicleId, ...record, created_at };
}

export async function deleteFuelRecord(id: string): Promise<void> {
  await db.runAsync('DELETE FROM fuel_records WHERE id = ?', [id]);
}

export async function getFuelSettings(vehicleId: string): Promise<VehicleFuelSettings> {
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT * FROM vehicle_fuel_settings WHERE vehicle_id = ?',
    [vehicleId]
  );
  if (!row) {
    return { vehicle_id: vehicleId, service_km_interval: 10000 };
  }
  return {
    vehicle_id: vehicleId,
    service_km_interval: row.service_km_interval,
    last_service_km: row.last_service_km ?? undefined,
    last_service_date: row.last_service_date ?? undefined,
  };
}

export async function saveFuelSettings(
  vehicleId: string,
  settings: Partial<VehicleFuelSettings>
): Promise<void> {
  const updated_at = new Date().toISOString();
  // Upsert
  const existing = await db.getFirstAsync<{ vehicle_id: string }>(
    'SELECT vehicle_id FROM vehicle_fuel_settings WHERE vehicle_id = ?',
    [vehicleId]
  );
  if (existing) {
    await db.runAsync(
      'UPDATE vehicle_fuel_settings SET service_km_interval = ?, last_service_km = ?, last_service_date = ?, updated_at = ? WHERE vehicle_id = ?',
      [
        settings.service_km_interval ?? 10000,
        settings.last_service_km ?? null,
        settings.last_service_date ?? null,
        updated_at,
        vehicleId,
      ]
    );
  } else {
    await db.runAsync(
      'INSERT INTO vehicle_fuel_settings (vehicle_id, service_km_interval, last_service_km, last_service_date, updated_at) VALUES (?, ?, ?, ?, ?)',
      [
        vehicleId,
        settings.service_km_interval ?? 10000,
        settings.last_service_km ?? null,
        settings.last_service_date ?? null,
        updated_at,
      ]
    );
  }
}

export async function computeFuelStats(vehicleId: string): Promise<FuelStats> {
  const records = await getFuelRecords(vehicleId);
  const settings = await getFuelSettings(vehicleId);

  const totalLiters = records.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalCost = records.reduce((s, r) => s + (r.price ?? 0), 0);

  // Calculează consum mediu L/100km din înregistrările cu km_total și liters
  const withKm = [...records]
    .filter(r => r.km_total !== undefined && r.liters !== undefined)
    .sort((a, b) => (a.km_total ?? 0) - (b.km_total ?? 0));

  let avgConsumptionL100: number | undefined;
  if (withKm.length >= 2) {
    const first = withKm[0];
    const last = withKm[withKm.length - 1];
    const totalKm = (last.km_total ?? 0) - (first.km_total ?? 0);
    // Suma litri fără primul (primul = ce era în rezervor la start, nu consumat)
    const totalLitersConsumed = withKm.slice(1).reduce((s, r) => s + (r.liters ?? 0), 0);
    if (totalKm > 0 && totalLitersConsumed > 0) {
      avgConsumptionL100 = (totalLitersConsumed / totalKm) * 100;
    }
  }

  const latestKm = withKm.length > 0 ? withKm[withKm.length - 1].km_total : undefined;

  let needsService = false;
  let kmUntilService: number | undefined;
  if (latestKm !== undefined && settings.last_service_km !== undefined) {
    kmUntilService = settings.last_service_km + settings.service_km_interval - latestKm;
    needsService = kmUntilService <= 0;
  } else if (latestKm !== undefined && settings.last_service_km === undefined) {
    // Nu s-a setat ultima revizie — nu alertăm
  }

  return {
    totalRecords: records.length,
    avgConsumptionL100,
    totalLiters,
    totalCost,
    latestKm,
    needsService,
    kmUntilService,
  };
}
