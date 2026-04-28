import { useCallback, useEffect, useState } from 'react';
import type { VehicleMaintenanceTask } from '@/types';
import * as maintenance from '@/services/maintenance';
import { on } from '@/services/events';

export function useMaintenanceTasks(vehicleId: string | undefined) {
  const [tasks, setTasks] = useState<VehicleMaintenanceTask[]>([]);
  const [currentKm, setCurrentKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setTasks([]);
      setCurrentKm(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, km] = await Promise.all([
        maintenance.getMaintenanceTasks(vehicleId),
        maintenance.getCurrentKm(vehicleId),
      ]);
      setTasks(list);
      setCurrentKm(km);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare la încărcarea mentenanței');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const trigger = () => {
      refresh().catch(() => {});
    };
    const offDocs = on('documents:changed', trigger);
    const offEntities = on('entities:changed', trigger);
    return () => {
      offDocs();
      offEntities();
    };
  }, [refresh]);

  return { tasks, currentKm, loading, error, refresh };
}
