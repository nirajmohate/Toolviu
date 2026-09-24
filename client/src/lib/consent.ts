'use client';

import { useSyncExternalStore } from 'react';

export type Consent = 'granted' | 'denied' | 'none' | 'pending';

const KEY = 'consent-v1';
const listeners = new Set<() => void>();

function read(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : 'none';
  } catch {
    return 'none';
  }
}

export function setConsent(value: 'granted' | 'denied' | 'none') {
  try {
    if (value === 'none') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, read, () => 'pending' as Consent);
}
