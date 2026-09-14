'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

// The loader must be stable (useCallback) until its request parameters change.
export default function useRemoteData(load, initialData, errorMessage, enabled = true) {
  const { addToast } = useToast();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    async function fetchData() {
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) setResult({ load, revision, data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ load, revision, failed: true });
          addToast(errorMessage, 'error');
        }
      }
    }

    fetchData();
    return () => controller.abort();
  }, [load, revision, enabled, addToast, errorMessage]);

  const current = enabled && result?.load === load && result?.revision === revision;
  return {
    data: current && !result.failed ? result.data : initialData,
    loading: enabled && !current,
    error: Boolean(current && result.failed),
    refresh,
  };
}
