// Lightweight, conservative minifiers. JavaScript is intentionally not minified here:
// doing that safely (strings, regex literals, ASI) needs a real parser.

const BLOCK_TAGS =
  'address|article|aside|blockquote|body|br|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hr|html|li|link|main|meta|nav|ol|option|p|section|select|table|tbody|td|tfoot|th|thead|title|tr|ul|script|style';

export function minifyHtml(src: string): string {
  const stash: string[] = [];
  // \u0000n\u0000 = inline-ish content (pre, textarea); \u0001n\u0001 = non-rendered blocks (script, style)
  const hold = (open: string) => (m: string) => {
    stash.push(m);
    return `${open}${stash.length - 1}${open}`;
  };
  let s = src.replace(/<(pre|textarea)\b[\s\S]*?<\/\1\s*>/gi, hold('\u0000'));
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, hold('\u0001'));
  s = s.replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, '');
  s = s.replace(/\s+/g, ' ');
  // whitespace next to block-level tags never affects rendering
  s = s.replace(new RegExp(`\\s*(<\\/?(?:${BLOCK_TAGS})\\b[^>]*>)\\s*`, 'gi'), '$1');
  s = s.replace(/\s*(\u0001\d+\u0001)\s*/g, '$1');
  s = s.replace(/<!doctype[^>]*>\s*/i, (m) => m.trim());
  s = s.trim();
  return s.replace(/[\u0000\u0001](\d+)[\u0000\u0001]/g, (_, i) => stash[Number(i)]);
}

export function minifyCss(src: string): string {
  const strings: string[] = [];
  let s = src.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) => {
    strings.push(m);
    return `\u0000${strings.length - 1}\u0000`;
  });
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/\s*([{};,>])\s*/g, '$1'); // "+" and "~" are left alone so calc(1px + 2px) stays valid
  s = s.replace(/\s+:(?=[^{};]*[;}])/g, ':'); // "color : red" but never the descendant selector "a :hover"
  s = s.replace(/:\s+/g, ':');
  s = s.replace(/;}/g, '}').trim();
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => strings[Number(i)]);
}
