const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/** "in 2 hours", "3 days ago" */
export function relativeTime(targetMs: number, nowMs: number): string {
  const diffSec = Math.round((targetMs - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === 'second') return rtf.format(Math.trunc(diffSec / secs), unit);
  }
  return '';
}

export function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}
