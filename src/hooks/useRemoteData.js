'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

// The loader must be stable (useCallback) until its request parameters change.
export default function useRemoteData(load, initialData, errorMessage, enabled = true) {
  const { addToast } = useToast();
  const [{ revision, result }, setState] = useState({ revision: 0, result: null });
  // Apply a confirmed save immediately, then reload to reconcile filters and totals.
  const refresh = useCallback(update => setState(previous => {
    const revision = previous.revision + 1;
    const canUpdate = typeof update === 'function' && previous.result?.load === load && !previous.result.failed;
    return {
      revision,
      result: canUpdate ? { load, revision, data: update(previous.result.data) } : previous.result,
    };
  }), [load]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    async function fetchData() {
      try {
        const data = await load(controller.signal);
        if (!controller.signal.aborted) setState(previous => previous.revision === revision ? { revision, result: { load, revision, data } } : previous);
      } catch (error) {
        if (!controller.signal.aborted) {
          setState(previous => previous.revision === revision ? { revision, result: { load, revision, failed: true } } : previous);
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
