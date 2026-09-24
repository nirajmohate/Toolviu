'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button, Field, Input, Notice, Select, TextArea } from './ui';

export function ContactForm() {
  const [type, setType] = useState('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    setError('');
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ type, message, email: email || undefined, website, page: document.referrer ? new URL(document.referrer).pathname : undefined }),
      });
      setState('done');
      setMessage('');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'done') {
    return <Notice kind="success">Thanks, your message was sent. We read everything, though we cannot reply to every note.</Notice>;
  }

  return (
    <form onSubmit={submit} className="panel max-w-xl space-y-4 p-5">
      <Field label="What is this about?" htmlFor="c-type">
        <Select id="c-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="idea">Idea or tool request</option>
          <option value="bug">Something is broken</option>
          <option value="other">Something else</option>
        </Select>
      </Field>
      <Field label="Your message" htmlFor="c-msg">
        <TextArea id="c-msg" rows={6} required minLength={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you need or what went wrong. Include the tool name and your browser if it is a bug." className="!font-sans text-sm" />
      </Field>
      <Field label="Email" hint="(optional, only if you want a reply)" htmlFor="c-email">
        <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      {/* Honeypot: hidden from people, irresistible to bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {state === 'error' ? <Notice kind="error">{error}</Notice> : null}
      <Button type="submit" variant="primary" disabled={state === 'busy'}>
        {state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Send message
      </Button>
    </form>
  );
}
