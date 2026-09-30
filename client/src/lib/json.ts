/**
 * A small strict JSON parser that keeps the original text of numbers and strings.
 * Why not JSON.parse? It silently rounds big integers (12345678901234567890) and
 * reports errors inconsistently across browsers. A formatter must never change data,
 * and users need a reliable line and column for every error.
 */

export type JsonNode =
  | { t: 'obj'; entries: { key: string; value: JsonNode }[] } // key = raw string literal including quotes
  | { t: 'arr'; items: JsonNode[] }
  | { t: 'lit'; raw: string; kind: 'string' | 'number' | 'boolean' | 'null' };

export class JsonSyntaxError extends Error {
  pos: number;
  line: number;
  column: number;
  constructor(message: string, pos: number, line: number, column: number) {
    super(message);
    this.name = 'JsonSyntaxError';
    this.pos = pos;
    this.line = line;
    this.column = column;
  }
}

export function lineCol(src: string, pos: number): { line: number; column: number } {
  let line = 1;
  let last = -1;
  const end = Math.min(pos, src.length);
  for (let i = 0; i < end; i += 1) {
    if (src.charCodeAt(i) === 10) {
      line += 1;
      last = i;
    }
  }
  return { line, column: pos - last };
}

const MAX_DEPTH = 800;
const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

function describe(c: string | undefined): string {
  if (c === undefined) return 'end of input';
  if (c === '\n') return 'line break';
  return `"${c}"`;
}

export function parseJsonAst(input: string): JsonNode {
  const src = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  let i = 0;
  const n = src.length;

  const fail = (message: string, at = i): never => {
    const { line, column } = lineCol(src, at);
    throw new JsonSyntaxError(message, at, line, column);
  };

  const ws = () => {
    while (i < n) {
      const c = src.charCodeAt(i);
      if (c === 32 || c === 10 || c === 13 || c === 9) i += 1;
      else break;
    }
  };

  const string = (): string => {
    const start = i;
    i += 1;
    while (i < n) {
      const c = src[i];
      if (c === '"') {
        i += 1;
        return src.slice(start, i);
      }
      if (c === '\\') {
        const e = src[i + 1];
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) fail('Invalid \\u escape: expected 4 hex digits', i);
          i += 6;
          continue;
        }
        if (e !== undefined && '"\\/bfnrt'.includes(e)) {
          i += 2;
          continue;
        }
        fail(`Invalid escape sequence "\\${e ?? ''}" in string`, i);
      }
      if (c < ' ') fail('Line breaks and control characters are not allowed inside strings. Use \\n instead', i);
      i += 1;
    }
    return fail('Unterminated string: missing closing double quote', start);
  };

  const value = (depth: number): JsonNode => {
    if (depth > MAX_DEPTH) fail('Nesting is too deep');
    ws();
    const c = src[i];
    if (c === undefined) fail('Unexpected end of input: expected a value', n);

    if (c === '{') {
      i += 1;
      const entries: { key: string; value: JsonNode }[] = [];
      ws();
      if (src[i] === '}') {
        i += 1;
        return { t: 'obj', entries };
      }
      for (;;) {
        ws();
        if (src[i] !== '"') {
          if (src[i] === '}' && entries.length) fail('Trailing comma: remove the comma before the closing brace');
          if (src[i] === "'") fail('Property names must use double quotes, not single quotes');
          fail(`Expected a property name in double quotes but found ${describe(src[i])}`);
        }
        const key = string();
        ws();
        if (src[i] !== ':') fail(`Expected ":" after the property name but found ${describe(src[i])}`);
        i += 1;
        entries.push({ key, value: value(depth + 1) });
        ws();
        if (src[i] === ',') {
          i += 1;
          continue;
        }
        if (src[i] === '}') {
          i += 1;
          return { t: 'obj', entries };
        }
        fail(`Expected "," or "}" but found ${describe(src[i])}`);
      }
    }

    if (c === '[') {
      i += 1;
      const items: JsonNode[] = [];
      ws();
      if (src[i] === ']') {
        i += 1;
        return { t: 'arr', items };
      }
      for (;;) {
        ws();
        if (src[i] === ']' && items.length) fail('Trailing comma: remove the comma before the closing bracket');
        items.push(value(depth + 1));
        ws();
        if (src[i] === ',') {
          i += 1;
          continue;
        }
        if (src[i] === ']') {
          i += 1;
          return { t: 'arr', items };
        }
        fail(`Expected "," or "]" but found ${describe(src[i])}`);
      }
    }

    if (c === '"') return { t: 'lit', raw: string(), kind: 'string' };

    if (c === '-' || (c >= '0' && c <= '9')) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(src);
      if (!m) fail('Invalid number');
      const raw = m![0];
      const next = src[i + raw.length];
      if (next !== undefined && /[0-9.eE+-]/.test(next)) fail(`Invalid number: unexpected ${describe(next)}`, i + raw.length);
      i += raw.length;
      return { t: 'lit', raw, kind: 'number' };
    }

    for (const [word, kind] of [['true', 'boolean'], ['false', 'boolean'], ['null', 'null']] as const) {
      if (src.startsWith(word, i)) {
        i += word.length;
        return { t: 'lit', raw: word, kind };
      }
    }

    if (c === "'") fail('Strings must use double quotes, not single quotes');
    if (/[A-Za-z_]/.test(c)) {
      const word = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 40))?.[0] ?? c;
      if (word === 'undefined' || word === 'NaN' || word === 'Infinity') fail(`"${word}" is not valid JSON. Use null instead`);
      fail(`Unexpected text "${word}". Strings need double quotes`);
    }
    return fail(`Unexpected ${describe(c)}`);
  };

  ws();
  if (i >= n) fail('Input is empty', 0);
  const root = value(0);
  ws();
  if (i < n) fail(`Unexpected ${describe(src[i])} after the end of the JSON value`);
  return root;
}

export type ParseResult = { ok: true; node: JsonNode } | { ok: false; error: JsonSyntaxError };

export function tryParse(src: string): ParseResult {
  try {
    return { ok: true, node: parseJsonAst(src) };
  } catch (e) {
    if (e instanceof JsonSyntaxError) return { ok: false, error: e };
    if (e instanceof RangeError) return { ok: false, error: new JsonSyntaxError('Nesting is too deep', 0, 1, 1) };
    throw e;
  }
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function printJson(node: JsonNode, opts: { indent: string; sortKeys?: boolean }): string {
  const { indent, sortKeys = false } = opts;
  const pretty = indent !== '';
  const out: string[] = [];

  const walk = (nd: JsonNode, level: number) => {
    if (nd.t === 'lit') {
      out.push(nd.raw);
      return;
    }
    if (nd.t === 'arr') {
      if (!nd.items.length) return void out.push('[]');
      out.push('[');
      nd.items.forEach((item, idx) => {
        if (idx) out.push(',');
        if (pretty) out.push('\n' + indent.repeat(level + 1));
        walk(item, level + 1);
      });
      if (pretty) out.push('\n' + indent.repeat(level));
      out.push(']');
      return;
    }
    if (!nd.entries.length) return void out.push('{}');
    const entries = sortKeys ? [...nd.entries].sort((a, b) => cmp(JSON.parse(a.key), JSON.parse(b.key))) : nd.entries;
    out.push('{');
    entries.forEach((e, idx) => {
      if (idx) out.push(',');
      if (pretty) out.push('\n' + indent.repeat(level + 1));
      out.push(e.key, pretty ? ': ' : ':');
      walk(e.value, level + 1);
    });
    if (pretty) out.push('\n' + indent.repeat(level));
    out.push('}');
  };

  walk(node, 0);
  return out.join('');
}

export type JsonStats = {
  objects: number;
  arrays: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  keys: number;
  maxDepth: number;
};

export function analyze(root: JsonNode): JsonStats {
  const s: JsonStats = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0, keys: 0, maxDepth: 0 };
  const walk = (nd: JsonNode, depth: number) => {
    s.maxDepth = Math.max(s.maxDepth, depth);
    if (nd.t === 'lit') {
      if (nd.kind === 'string') s.strings += 1;
      else if (nd.kind === 'number') s.numbers += 1;
      else if (nd.kind === 'boolean') s.booleans += 1;
      else s.nulls += 1;
    } else if (nd.t === 'arr') {
      s.arrays += 1;
      nd.items.forEach((x) => walk(x, depth + 1));
    } else {
      s.objects += 1;
      s.keys += nd.entries.length;
      nd.entries.forEach((e) => walk(e.value, depth + 1));
    }
  };
  walk(root, 1);
  return s;
}

/** Conservative repair of "almost JSON": comments, trailing commas, single quotes, bare keys, Python literals. */
export function repairJson(input: string): string {
  const src = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const n = src.length;
  let out = '';
  let i = 0;

  const skipTrivia = (from: number): number => {
    let j = from;
    for (;;) {
      while (j < n && /\s/.test(src[j])) j += 1;
      if (src[j] === '/' && src[j + 1] === '/') {
        while (j < n && src[j] !== '\n') j += 1;
      } else if (src[j] === '/' && src[j + 1] === '*') {
        j += 2;
        while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j += 1;
        j += 2;
      } else return j;
    }
  };

  while (i < n) {
    const c = src[i];

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let body = '';
      while (j < n && src[j] !== quote) {
        if (src[j] === '\\' && j + 1 < n) {
          if (quote === "'" && src[j + 1] === "'") body += "'";
          else body += src[j] + src[j + 1];
          j += 2;
          continue;
        }
        if (src[j] === '\n') body += '\\n';
        else if (quote === "'" && src[j] === '"') body += '\\"';
        else body += src[j];
        j += 1;
      }
      out += `"${body}"`;
      i = j + 1;
      continue;
    }

    if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
      i = skipTrivia(i);
      continue;
    }

    if (c === ',') {
      const j = skipTrivia(i + 1);
      if (src[j] === '}' || src[j] === ']') {
        i += 1; // drop trailing comma
        continue;
      }
      out += c;
      i += 1;
      continue;
    }

    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[\w$]/.test(src[j])) j += 1;
      const word = src.slice(i, j);
      const k = skipTrivia(j);
      if (src[k] === ':') out += `"${word}"`;
      else if (word === 'True') out += 'true';
      else if (word === 'False') out += 'false';
      else if (word === 'None' || word === 'undefined') out += 'null';
      else out += word;
      i = j;
      continue;
    }

    out += c;
    i += 1;
  }
  return out;
}

/** Shows the failing line with a caret, for the validator. */
export function errorContext(src: string, err: JsonSyntaxError): string {
  const lines = src.split('\n');
  const start = Math.max(0, err.line - 3);
  const end = Math.min(lines.length, err.line + 2);
  const width = String(end).length;
  const rows: string[] = [];
  for (let l = start; l < end; l += 1) {
    const text = lines[l].length > 160 ? `${lines[l].slice(0, 160)}…` : lines[l];
    rows.push(`${String(l + 1).padStart(width, ' ')} | ${text}`);
    if (l + 1 === err.line) rows.push(`${' '.repeat(width)} | ${' '.repeat(Math.min(Math.max(err.column - 1, 0), 160))}^`);
  }
  return rows.join('\n');
}

export const SAMPLE_JSON = `{"id":1024,"name":"Ada Lovelace","active":true,"score":98.6,"tags":["math","engines","poetry"],"address":{"city":"London","geo":{"lat":51.5072,"lng":-0.1276}},"bigNumber":12345678901234567890,"notes":null}`;
