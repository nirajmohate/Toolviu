import { Binary, Braces, Clock, CodeXml, Fingerprint, Hash, KeyRound, Link2, Palette, Regex, Send, ShieldCheck, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import type { IconName } from '@/lib/tools';

const icons: Record<IconName, ComponentType<LucideProps>> = {
  braces: Braces,
  'shield-check': ShieldCheck,
  'key-round': KeyRound,
  regex: Regex,
  send: Send,
  palette: Palette,
  'code-xml': CodeXml,
  binary: Binary,
  link: Link2,
  fingerprint: Fingerprint,
  hash: Hash,
  clock: Clock,
};

export function ToolIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden />;
}
