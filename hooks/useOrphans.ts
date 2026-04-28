import { useCallback, useEffect, useState } from 'react';
import { getOrphans, type OrphanGroup } from '@/services/orphans';
import { on } from '@/services/events';

export function useOrphans() {
  const [groups, setGroups] = useState<OrphanGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrphans();
      setGroups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nu s-au putut detecta înregistrările incomplete');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const trigger = () => {
      refresh().catch(() => {});
    };
    const offDocs = on('documents:changed', trigger);
    const offLinks = on('links:changed', trigger);
    const offEntities = on('entities:changed', trigger);
    return () => {
      offDocs();
      offLinks();
      offEntities();
    };
  }, [refresh]);

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return { groups, totalItems, loading, error, refresh };
}
