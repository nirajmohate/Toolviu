// Runs a user supplied regular expression in a throw-away Web Worker with a time limit.
// A pattern like (a+)+$ can take exponential time; in the main thread that would freeze the tab.

export type RegexMatch = {
  index: number;
  end: number;
  text: string;
  groups: (string | null)[];
  named: Record<string, string | null> | null;
};

export type RegexResult =
  | { ok: true; matches: RegexMatch[]; truncated: boolean; replaced: string | null }
  | { ok: false; error: string; timedOut?: boolean };

const WORKER_SOURCE = `
self.onmessage = function (e) {
  var d = e.data;
  try {
    var re = new RegExp(d.pattern, d.flags);
    var isGlobal = d.flags.indexOf('g') !== -1;
    var matches = [];
    var truncated = false;
    var m;
    while ((m = re.exec(d.text)) !== null) {
      var groups = [];
      for (var i = 1; i < m.length; i++) groups.push(m[i] === undefined ? null : m[i]);
      var named = null;
      if (m.groups) { named = {}; for (var k in m.groups) named[k] = m.groups[k] === undefined ? null : m.groups[k]; }
      matches.push({ index: m.index, end: m.index + m[0].length, text: m[0], groups: groups, named: named });
      if (m[0] === '') re.lastIndex++;
      if (!isGlobal) break;
      if (matches.length >= d.limit) { truncated = true; break; }
    }
    var replaced = null;
    if (typeof d.replacement === 'string') replaced = d.text.replace(new RegExp(d.pattern, d.flags), d.replacement);
    self.postMessage({ ok: true, matches: matches, truncated: truncated, replaced: replaced });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};`;

let workerUrl: string | null = null;

export function runRegex(
  req: { pattern: string; flags: string; text: string; replacement: string | null },
  opts: { timeoutMs?: number; limit?: number } = {},
): { promise: Promise<RegexResult>; cancel: () => void } {
  const { timeoutMs = 1500, limit = 5000 } = opts;
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settle: (r: RegexResult) => void = () => {};

  const promise = new Promise<RegexResult>((resolve) => {
    settle = (r) => {
      clearTimeout(timer);
      worker?.terminate();
      worker = null;
      resolve(r);
    };
    try {
      if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      worker = new Worker(workerUrl);
    } catch {
      settle({ ok: false, error: 'Web Workers are not available in this browser.' });
      return;
    }
    worker.onmessage = (e: MessageEvent<RegexResult>) => settle(e.data);
    worker.onerror = () => settle({ ok: false, error: 'The pattern could not be evaluated.' });
    timer = setTimeout(
      () => settle({ ok: false, timedOut: true, error: 'The pattern took too long to run and was stopped. It may cause catastrophic backtracking, for example nested quantifiers like (a+)+.' }),
      timeoutMs,
    );
    worker.postMessage({ ...req, limit });
  });

  return { promise, cancel: () => settle({ ok: false, error: 'cancelled' }) };
}
