'use client';

import { useEffect } from 'react';
import { apiUrl } from '@/lib/api';

/** Privacy-friendly usage counter: one anonymous ping per tool per browser session. No cookies, no IDs. */
export function TrackView({ tool }: { tool: string }) {
  useEffect(() => {
    try {
      const key = `viewed:${tool}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* still send once */
    }
    fetch(apiUrl('/api/stats/view'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool }),
      keepalive: true,
    }).catch(() => {});
  }, [tool]);
  return null;
}
