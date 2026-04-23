import { buildVehicleStatusItems, type StatusItemRaw } from '@/services/vehicleStatus';
import type { Document } from '@/types';
import type { FuelStats } from '@/services/fuel';

function doc(overrides: Partial<Document> & { type: Document['type'] }): Document {
  return {
    id: 'd1',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Document;
}

function emptyStats(): FuelStats {
  return {
    totalRecords: 0,
    totalLiters: 0,
    totalCost: 0,
    needsService: false,
    consumptionSparkline: [],
  };
}

describe('buildVehicleStatusItems', () => {
  const today = new Date('2026-04-23T00:00:00.000Z');

  it('returns empty array when vehicle has no docs and no fuel data', () => {
    const items = buildVehicleStatusItems({
      documents: [],
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    expect(items).toEqual([]);
  });

  it('includes RCA slot with critical when expiring in 3 days', () => {
    const items = buildVehicleStatusItems({
      documents: [doc({ id: 'r1', type: 'rca', expiry_date: '2026-04-26' })],
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    const rca = items.find(i => i.key === 'rca');
    expect(rca).toBeDefined();
    expect(rca?.severity).toBe('critical');
  });

  it('RCA severity warning when within notificationDays but > 7', () => {
    const items = buildVehicleStatusItems({
      documents: [doc({ id: 'r1', type: 'rca', expiry_date: '2026-05-10' })], // +17 zile
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    expect(items.find(i => i.key === 'rca')?.severity).toBe('warning');
  });

  it('RCA severity ok when expiring beyond notificationDays', () => {
    const items = buildVehicleStatusItems({
      documents: [doc({ id: 'r1', type: 'rca', expiry_date: '2026-08-10' })],
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    expect(items.find(i => i.key === 'rca')?.severity).toBe('ok');
  });

  it('RCA expired → critical with value "Expirat"', () => {
    const items = buildVehicleStatusItems({
      documents: [doc({ id: 'r1', type: 'rca', expiry_date: '2026-01-01' })],
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    const rca = items.find(i => i.key === 'rca');
    expect(rca?.severity).toBe('critical');
    expect(rca?.value).toBe('Expirat');
  });

  it('picks RCA with max expiry_date when multiple exist', () => {
    const items = buildVehicleStatusItems({
      documents: [
        doc({ id: 'r1', type: 'rca', expiry_date: '2026-05-01' }),
        doc({ id: 'r2', type: 'rca', expiry_date: '2027-05-01' }),
      ],
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    expect(items.find(i => i.key === 'rca')?.docId).toBe('r2');
  });

  it('hides ITP slot when itpEnabled is false', () => {
    const items = buildVehicleStatusItems({
      documents: [doc({ id: 't1', type: 'itp', expiry_date: '2026-08-01' })],
      fuelStats: emptyStats(),
      itpEnabled: false,
      notificationDays: 30,
      today,
    });
    expect(items.find(i => i.key === 'itp')).toBeUndefined();
  });

  it('includes CASCO slot with same rules as RCA', () => {
    const items = buildVehicleStatusItems({
      documents: [doc({ id: 'c1', type: 'casco', expiry_date: '2026-04-26' })],
      fuelStats: emptyStats(),
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    const casco = items.find(i => i.key === 'casco');
    expect(casco).toBeDefined();
    expect(casco?.severity).toBe('critical');
  });

  it('service slot shown when last_service_km and latestKm known', () => {
    const items = buildVehicleStatusItems({
      documents: [],
      fuelStats: {
        ...emptyStats(),
        latestKm: 129600,
        needsService: false,
        kmUntilService: 400,
      },
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    const svc = items.find(i => i.key === 'service');
    expect(svc).toBeDefined();
    expect(svc?.severity).toBe('critical'); // ≤500 km
  });

  it('service slot absent when kmUntilService undefined', () => {
    const items = buildVehicleStatusItems({
      documents: [],
      fuelStats: { ...emptyStats(), latestKm: 100000 },
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    expect(items.find(i => i.key === 'service')).toBeUndefined();
  });

  it('consum slot only when avg defined', () => {
    const items = buildVehicleStatusItems({
      documents: [],
      fuelStats: { ...emptyStats(), avgConsumptionL100: 7.2, consumptionSparkline: [7, 7.2, 7.1] },
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    const fuel = items.find(i => i.key === 'fuel');
    expect(fuel).toBeDefined();
    expect(fuel?.severity).toBe('ok');
    expect(fuel?.sparkline).toEqual([7, 7.2, 7.1]);
  });

  it('orders items RCA, CASCO, ITP, service, fuel', () => {
    const items = buildVehicleStatusItems({
      documents: [
        doc({ id: 'r1', type: 'rca', expiry_date: '2026-08-01' }),
        doc({ id: 'c1', type: 'casco', expiry_date: '2026-08-01' }),
        doc({ id: 't1', type: 'itp', expiry_date: '2026-08-01' }),
      ],
      fuelStats: {
        ...emptyStats(),
        latestKm: 100000,
        kmUntilService: 3000,
        avgConsumptionL100: 7,
        consumptionSparkline: [7],
      },
      itpEnabled: true,
      notificationDays: 30,
      today,
    });
    expect(items.map(i => i.key)).toEqual(['rca', 'casco', 'itp', 'service', 'fuel']);
  });
});
