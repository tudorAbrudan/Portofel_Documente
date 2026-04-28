import { useEffect, useState, useCallback } from 'react';
import type { Document } from '@/types';
import * as docs from '@/services/documents';
import { on } from '@/services/events';

export function useDocuments() {
  const [list, setList] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await docs.applyAutoDelete();
      const data = await docs.getDocuments();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const offDocs = on('documents:changed', () => {
      refresh().catch(() => {});
    });
    const offLinks = on('links:changed', () => {
      refresh().catch(() => {});
    });
    return () => {
      offDocs();
      offLinks();
    };
  }, [refresh]);

  return {
    documents: list,
    loading,
    error,
    refresh,
    createDocument: docs.createDocument,
    deleteDocument: docs.deleteDocument,
    getDocumentsExpiringIn: docs.getDocumentsExpiringIn,
    getDocumentsByEntity: docs.getDocumentsByEntity,
  };
}
