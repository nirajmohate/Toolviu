'use client';

import { useEffect, useRef, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from './ui';
import { createShare, loadShare } from '@/lib/share';
import { copyText } from '@/lib/download';

/** Saves the tool state on the server and copies a short link. Links expire automatically. */
export function ShareButton({ tool, getPayload, disabled }: { tool: string; getPayload: () => unknown; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function share() {
    setState('busy');
    setMessage('');
    try {
      const { url, expiresInDays } = await createShare(tool, getPayload());
      const copied = await copyText(url);
      setState('done');
      setMessage(copied ? `Link copied. Expires in ${expiresInDays} days.` : url);
    } catch (e) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Could not create the link.');
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" onClick={share} disabled={disabled || state === 'busy'}>
        {state === 'busy' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
        Share link
      </Button>
      {message ? (
        <span role="status" className={`max-w-[16rem] truncate text-xs ${state === 'error' ? 'text-danger' : 'text-ok'}`} title={message}>
          {message}
        </span>
      ) : null}
    </span>
  );
}

/** Loads shared state when the page is opened with ?share=ID. */
export function useShareLoader<T>(tool: string, onLoad: (payload: T) => void): { error: string | null; loading: boolean } {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cb = useRef(onLoad);
  cb.current = onLoad;

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('share');
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    loadShare<T>(tool, id)
      .then((payload) => {
        if (!cancelled) cb.current(payload);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the shared link.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tool]);

  return { error, loading };
}
