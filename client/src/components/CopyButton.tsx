'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui';
import { copyText } from '@/lib/download';

export function CopyButton({
  text,
  label = 'Copy',
  size = 'sm',
  variant = 'secondary',
  disabled,
  iconOnly,
}: {
  text: string | (() => string);
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    const value = typeof text === 'function' ? text() : text;
    const ok = await copyText(value);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  }

  const shown = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label;
  return (
    <Button size={size} variant={variant} onClick={onClick} disabled={disabled} aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
      {state === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {iconOnly ? <span className="sr-only" aria-live="polite">{shown}</span> : <span aria-live="polite">{shown}</span>}
    </Button>
  );
}
