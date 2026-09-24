// Keep in sync with client/src/lib/tools.ts
export const TOOL_SLUGS = [
  'json-formatter',
  'json-validator',
  'jwt-decoder',
  'regex-tester',
  'api-tester',
  'css-generator',
  'html-formatter',
  'base64-encoder-decoder',
  'url-encoder-decoder',
  'uuid-generator',
  'hash-generator',
  'unix-timestamp-converter',
];

// Tools whose state can be saved and shared through a short link.
// (JWT, API tester and hash generator are deliberately excluded: they often hold secrets.)
export const SHAREABLE_TOOLS = [
  'json-formatter',
  'json-validator',
  'regex-tester',
  'html-formatter',
  'css-generator',
  'base64-encoder-decoder',
  'url-encoder-decoder',
];
