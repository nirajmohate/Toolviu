// Tool catalogue. Adding a tool = add an entry here, a component in
// src/components/tools/, register it in registry.ts, and add the slug to server/src/utils/tools.js.

export type CategoryId = 'format' | 'decode' | 'test' | 'generate';

export const categories: Record<CategoryId, { name: string; blurb: string }> = {
  format: { name: 'Format and validate', blurb: 'Clean up messy data and find mistakes fast.' },
  decode: { name: 'Encode and decode', blurb: 'Read tokens, strings and timestamps.' },
  test: { name: 'Test and debug', blurb: 'Try out patterns and endpoints.' },
  generate: { name: 'Generate', blurb: 'Create IDs, hashes and styles.' },
};

export type IconName =
  | 'braces'
  | 'shield-check'
  | 'key-round'
  | 'regex'
  | 'send'
  | 'palette'
  | 'code-xml'
  | 'binary'
  | 'link'
  | 'fingerprint'
  | 'hash'
  | 'clock';

export type Tool = {
  slug: string;
  name: string;
  seoTitle: string;
  category: CategoryId;
  icon: IconName;
  tagline: string;
  description: string;
  keywords: string[];
  intro: string;
  steps: string[];
  faq: { q: string; a: string }[];
  related: string[];
};

export const tools: Tool[] = [
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    seoTitle: 'JSON Formatter & Beautifier Online',
    category: 'format',
    icon: 'braces',
    tagline: 'Beautify, minify and sort JSON with line-accurate errors.',
    description:
      'Free online JSON formatter and beautifier. Pretty-print, minify, sort keys and auto-fix broken JSON. Runs in your browser, no login needed.',
    keywords: ['json formatter', 'json beautifier', 'json pretty print', 'json minify', 'format json online', 'fix json'],
    intro:
      'Paste JSON of any size and get a readable, consistently indented version in one click. The formatter also minifies, sorts keys alphabetically and can repair common mistakes such as trailing commas, single quotes and unquoted keys. When the JSON is invalid, it tells you the exact line and column.',
    steps: [
      'Paste or type your JSON into the input panel, or load the sample.',
      'Pick an indent size and press Format. Use Minify for the smallest output.',
      'Press Auto-fix if the input has trailing commas, comments or single quotes.',
      'Copy the result, download it as a .json file, or create a share link.',
    ],
    faq: [
      {
        q: 'Is my JSON uploaded anywhere?',
        a: 'No. Formatting happens entirely in your browser. Your data is only sent to a server if you press the Share button, which stores it for a limited time so the link works.',
      },
      {
        q: 'What does Auto-fix change?',
        a: 'It removes comments and trailing commas, converts single-quoted strings to double quotes, quotes bare object keys, and converts Python-style True, False and None to JSON values. Always review the result.',
      },
      {
        q: 'How large a file can I format?',
        a: 'Several megabytes work fine on a modern computer. Very large files (tens of megabytes) may slow down your browser because everything runs locally.',
      },
    ],
    related: ['json-validator', 'html-formatter', 'base64-encoder-decoder'],
  },
  {
    slug: 'json-validator',
    name: 'JSON Validator',
    seoTitle: 'JSON Validator & Schema Checker Online',
    category: 'format',
    icon: 'shield-check',
    tagline: 'Check JSON syntax and validate against a JSON Schema.',
    description:
      'Free online JSON validator. Find syntax errors with line and column numbers and validate JSON against a JSON Schema (draft-07). Private and instant.',
    keywords: ['json validator', 'validate json', 'json schema validator', 'json lint', 'check json syntax'],
    intro:
      'Validate JSON syntax and see exactly where it breaks, with the offending line highlighted. Add a JSON Schema to check that the data has the right shape: required fields, types, ranges and formats. You also get a quick structural summary of the document.',
    steps: [
      'Paste your JSON into the left panel. It is validated as you type.',
      'Fix any error shown, using the line and column it points to.',
      'Optional: switch on Schema mode and paste a JSON Schema to check the structure.',
      'Read the summary for key count, depth and size.',
    ],
    faq: [
      {
        q: 'Which JSON Schema version is supported?',
        a: 'Draft-07 (the most widely used version) is supported. Unknown keywords are ignored rather than rejected.',
      },
      {
        q: 'Why does my JSON fail when it works in JavaScript?',
        a: 'JavaScript object literals are more lenient than JSON. JSON requires double-quoted keys and strings, and forbids comments, trailing commas and undefined.',
      },
      {
        q: 'Does the validator send my data to a server?',
        a: 'No. Validation runs locally in your browser.',
      },
    ],
    related: ['json-formatter', 'jwt-decoder', 'regex-tester'],
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    seoTitle: 'JWT Decoder & Verifier Online',
    category: 'decode',
    icon: 'key-round',
    tagline: 'Decode JSON Web Tokens and check expiry, locally.',
    description:
      'Free JWT decoder. Decode header and payload, see expiry and issued-at times, and verify HS256/HS384/HS512 signatures. Your token never leaves your browser.',
    keywords: ['jwt decoder', 'decode jwt', 'jwt parser', 'jwt debugger', 'json web token', 'jwt expiry'],
    intro:
      'Paste a JSON Web Token to read its header and claims. Time-based claims (exp, iat, nbf) are converted to readable dates and the tool tells you whether the token is expired. If you have the shared secret, you can also verify HMAC signatures. Nothing is sent over the network.',
    steps: [
      'Paste the full token (three parts separated by dots). A leading "Bearer " is removed automatically.',
      'Read the decoded header and payload. Expiry status appears above the payload.',
      'To check the signature of an HS256, HS384 or HS512 token, enter the secret.',
    ],
    faq: [
      {
        q: 'Is it safe to paste a real token here?',
        a: 'Decoding runs locally and the token is never uploaded. Still, treat live production tokens with care and prefer test tokens when you can.',
      },
      {
        q: 'Why can it not verify my RS256 token?',
        a: 'Only HMAC-based algorithms (HS256, HS384, HS512) can be verified with a shared secret. Asymmetric algorithms need a public key and are decoded but not verified here.',
      },
      {
        q: 'Is a JWT encrypted?',
        a: 'A standard signed JWT is only encoded, not encrypted. Anyone with the token can read the payload, so never put secrets in it.',
      },
    ],
    related: ['base64-encoder-decoder', 'unix-timestamp-converter', 'hash-generator'],
  },
  {
    slug: 'regex-tester',
    name: 'Regex Tester',
    seoTitle: 'Regex Tester with Live Match Highlighting',
    category: 'test',
    icon: 'regex',
    tagline: 'Test JavaScript regular expressions with live highlighting.',
    description:
      'Free online regex tester for JavaScript. Live match highlighting, capture groups, named groups, replace preview and a cheat sheet. Runs safely in your browser.',
    keywords: ['regex tester', 'regular expression tester', 'regex online', 'javascript regex', 'regex match', 'regex cheat sheet'],
    intro:
      'Write a pattern, toggle flags and see every match highlighted in your test text as you type. Capture groups and named groups are listed for each match, and a replace preview shows what your substitution would produce. Patterns run in a background worker with a time limit, so a runaway expression cannot freeze the page.',
    steps: [
      'Enter your pattern and choose flags such as g (global) or i (case-insensitive).',
      'Paste the text you want to test. Matches are highlighted immediately.',
      'Check the match list for groups and positions.',
      'Optional: enter a replacement (for example $1-$2) to preview the result.',
    ],
    faq: [
      {
        q: 'Which regex flavour does this use?',
        a: 'JavaScript (ECMAScript), the same engine used by browsers and Node.js. Some features differ from PCRE, Python or Java.',
      },
      {
        q: 'What is catastrophic backtracking?',
        a: 'Some patterns, such as nested quantifiers like (a+)+, can take exponential time on certain inputs. The tester stops after a short time limit and warns you.',
      },
      {
        q: 'How do I use named groups?',
        a: 'Write (?<year>\\d{4}) in your pattern. The match list shows the group name and value, and you can refer to it in replacements as $<year>.',
      },
    ],
    related: ['json-validator', 'url-encoder-decoder', 'html-formatter'],
  },
  {
    slug: 'api-tester',
    name: 'API Tester',
    seoTitle: 'Online API Tester: Send HTTP Requests',
    category: 'test',
    icon: 'send',
    tagline: 'Send GET, POST, PUT and DELETE requests without CORS errors.',
    description:
      'Free online API tester. Send HTTP requests with custom headers, auth and body, inspect status, timing and response, and copy as cURL. No login or install.',
    keywords: ['api tester', 'online api tester', 'http client online', 'rest api tester', 'postman alternative', 'send http request online'],
    intro:
      'Build a request, send it and inspect the response, all without installing anything. In Proxy mode the request is sent from our server, which avoids browser CORS limits. In Browser mode it is sent directly from your machine, which lets you test APIs on localhost. You can copy any request as a cURL command or fetch snippet.',
    steps: [
      'Choose a method, enter the URL and add headers or query parameters as needed.',
      'Add a body for POST, PUT and PATCH requests, or set Bearer or Basic authentication.',
      'Press Send. Read the status, time, size, headers and formatted body.',
      'Use Copy as cURL to reproduce the call in a terminal.',
    ],
    faq: [
      {
        q: 'Why is there a Proxy mode and a Browser mode?',
        a: 'Browsers block cross-origin requests unless the API allows them. Proxy mode sends the request from our server, so it works with any public API. Browser mode is needed for localhost and private network addresses, which our server cannot reach.',
      },
      {
        q: 'Can I call localhost or internal IPs?',
        a: 'Use Browser mode for those. For safety, Proxy mode blocks private, loopback and cloud-metadata addresses. In Browser mode the API must allow CORS from this site.',
      },
      {
        q: 'Are my requests stored?',
        a: 'Requests are not logged or stored on the server. A short history of your recent requests is kept in your own browser only, and you can clear it at any time.',
      },
    ],
    related: ['json-formatter', 'jwt-decoder', 'url-encoder-decoder'],
  },
  {
    slug: 'css-generator',
    name: 'CSS Generator',
    seoTitle: 'CSS Generator: Box Shadow, Gradient, Border Radius',
    category: 'generate',
    icon: 'palette',
    tagline: 'Visual generators for shadows, gradients, radius and glass.',
    description:
      'Free CSS generator with live preview: box-shadow, linear/radial/conic gradients, border-radius and glassmorphism. Copy clean, ready-to-use CSS.',
    keywords: ['css generator', 'box shadow generator', 'css gradient generator', 'border radius generator', 'glassmorphism generator'],
    intro:
      'Four visual generators in one place: layered box shadows, linear, radial and conic gradients, per-corner border radius and glassmorphism. Adjust the sliders, watch the live preview and copy CSS that is ready to paste into your stylesheet.',
    steps: [
      'Pick a generator using the tabs: Box shadow, Gradient, Border radius or Glass.',
      'Adjust the controls. The preview updates as you drag.',
      'Copy the generated CSS with one click.',
    ],
    faq: [
      {
        q: 'Does it output Tailwind classes?',
        a: 'It outputs plain CSS. Values can be used in Tailwind with arbitrary values such as shadow-[0_10px_30px_rgba(0,0,0,0.2)].',
      },
      {
        q: 'Is backdrop-filter supported everywhere?',
        a: 'All current major browsers support backdrop-filter. The generator includes the -webkit- prefix for older Safari versions.',
      },
      {
        q: 'Can I use multiple shadows?',
        a: 'Yes. Add layers in the Box shadow tab and they are combined into a single box-shadow declaration.',
      },
    ],
    related: ['html-formatter', 'json-formatter', 'hash-generator'],
  },
  {
    slug: 'html-formatter',
    name: 'HTML Formatter',
    seoTitle: 'HTML, CSS & JS Formatter and Minifier',
    category: 'format',
    icon: 'code-xml',
    tagline: 'Beautify HTML, CSS and JavaScript, or minify HTML and CSS.',
    description:
      'Free online HTML formatter and beautifier. Beautify HTML, CSS and JavaScript with custom indentation, or minify HTML and CSS. Fast, private and no signup.',
    keywords: ['html formatter', 'html beautifier', 'html minifier', 'css beautifier', 'javascript beautifier', 'format html online'],
    intro:
      'Turn minified or messy markup into clean, indented code, or squeeze it down for production. The same tool handles HTML, CSS and JavaScript, with control over indent size, line wrapping and attribute wrapping.',
    steps: [
      'Choose the language: HTML, CSS or JavaScript.',
      'Paste your code into the input panel.',
      'Press Beautify for readable output, or Minify (HTML and CSS) to shrink it.',
      'Copy or download the result.',
    ],
    faq: [
      {
        q: 'Will minifying change how my page behaves?',
        a: 'The HTML minifier removes comments and extra whitespace while leaving pre, textarea, script and style content untouched, and the CSS minifier removes comments and whitespace. JavaScript is beautify-only here, because safe minification needs a real parser. Use a build tool such as esbuild or Terser for production bundles.',
      },
      {
        q: 'Does it fix invalid HTML?',
        a: 'No. It formats what you give it. Use a validator to check for unclosed tags or invalid nesting.',
      },
      {
        q: 'Is my code sent anywhere?',
        a: 'No. Formatting is done locally in your browser unless you use the Share button.',
      },
    ],
    related: ['css-generator', 'json-formatter', 'url-encoder-decoder'],
  },
  {
    slug: 'base64-encoder-decoder',
    name: 'Base64 Encoder / Decoder',
    seoTitle: 'Base64 Encode & Decode Online (Text and Files)',
    category: 'decode',
    icon: 'binary',
    tagline: 'Encode or decode Base64 for text, URLs and files.',
    description:
      'Free Base64 encoder and decoder. Convert text or files to Base64, decode Base64 back, use URL-safe mode and create data URIs. Unicode-safe and private.',
    keywords: ['base64 encode', 'base64 decode', 'base64 encoder', 'base64 to text', 'image to base64', 'data uri generator'],
    intro:
      'Convert text to Base64 and back with full Unicode support, so emoji and accented characters survive the round trip. Switch on URL-safe mode for tokens and query strings, or drop in a file to get its Base64 or a ready-to-use data URI.',
    steps: [
      'Choose Encode or Decode.',
      'Type or paste your text. The result appears instantly.',
      'Toggle URL-safe to use - and _ instead of + and /.',
      'To convert a file, use the file picker and copy the Base64 or data URI.',
    ],
    faq: [
      {
        q: 'Is Base64 a form of encryption?',
        a: 'No. Base64 is an encoding that anyone can reverse. Never use it to protect secrets.',
      },
      {
        q: 'Why does decoding say my input is invalid?',
        a: 'Valid Base64 uses only letters, digits, +, /, and = padding (or - and _ in the URL-safe variant). Whitespace is ignored, but any other character is an error.',
      },
      {
        q: 'What is the size overhead?',
        a: 'Base64 output is about 33 percent larger than the original data.',
      },
    ],
    related: ['url-encoder-decoder', 'jwt-decoder', 'hash-generator'],
  },
  {
    slug: 'url-encoder-decoder',
    name: 'URL Encoder / Decoder',
    seoTitle: 'URL Encoder & Decoder Online (Percent-Encoding)',
    category: 'decode',
    icon: 'link',
    tagline: 'Percent-encode URLs and inspect query parameters.',
    description:
      'Free URL encoder and decoder. Percent-encode or decode text, choose component or full-URL mode, and break any URL into parts and query parameters.',
    keywords: ['url encode', 'url decode', 'percent encoding', 'urlencode online', 'encodeuricomponent', 'query string parser'],
    intro:
      'Encode special characters for safe use in URLs, or decode percent-encoded strings back to readable text. A URL inspector splits any address into protocol, host, path, query parameters and hash, so you can see exactly what is being sent.',
    steps: [
      'Choose Encode or Decode, and Component or Full URL mode.',
      'Paste your text or URL. The result updates as you type.',
      'Paste a full URL into the inspector to see each part and its query parameters.',
    ],
    faq: [
      {
        q: 'What is the difference between Component and Full URL mode?',
        a: 'Component mode (encodeURIComponent) encodes everything except letters, digits and - _ . ! ~ * \' ( ). Full URL mode (encodeURI) keeps characters that structure a URL, such as : / ? & = and #.',
      },
      {
        q: 'Why do I see + instead of %20 for spaces?',
        a: 'In HTML form data (application/x-www-form-urlencoded), spaces are written as +. In other parts of a URL they are written as %20. The decoder can treat + as a space when you enable that option.',
      },
      {
        q: 'Is anything sent to a server?',
        a: 'No. Encoding and decoding happen in your browser.',
      },
    ],
    related: ['base64-encoder-decoder', 'api-tester', 'regex-tester'],
  },
  {
    slug: 'uuid-generator',
    name: 'UUID Generator',
    seoTitle: 'UUID Generator: v4 and v7, Bulk Generate',
    category: 'generate',
    icon: 'fingerprint',
    tagline: 'Generate v4 and time-ordered v7 UUIDs in bulk.',
    description:
      'Free UUID generator. Create random v4 or time-ordered v7 UUIDs, up to 1000 at once, in uppercase, without hyphens or with braces. Uses secure randomness.',
    keywords: ['uuid generator', 'guid generator', 'uuid v4', 'uuid v7', 'generate uuid online', 'bulk uuid'],
    intro:
      'Generate universally unique identifiers using your browser\'s cryptographically secure random number generator. Choose random v4 for general use or time-ordered v7, which sorts by creation time and is friendlier to database indexes. Generate up to 1000 at once and copy them as a list.',
    steps: [
      'Choose a version: v4 (random) or v7 (time-ordered).',
      'Set how many UUIDs you need and pick a format.',
      'Press Generate, then copy one UUID or the whole list.',
    ],
    faq: [
      {
        q: 'Can two generated UUIDs collide?',
        a: 'For v4 the chance is astronomically small. You would need to generate billions per second for many years to expect a single collision.',
      },
      {
        q: 'When should I use v7 instead of v4?',
        a: 'Use v7 as a database primary key when insert order matters. Its timestamp prefix keeps new rows adjacent in an index, while v4 values scatter randomly.',
      },
      {
        q: 'Is a UUID the same as a GUID?',
        a: 'Yes. GUID is the name Microsoft uses for the same 128-bit identifier format.',
      },
    ],
    related: ['hash-generator', 'unix-timestamp-converter', 'base64-encoder-decoder'],
  },
  {
    slug: 'hash-generator',
    name: 'Hash Generator',
    seoTitle: 'Hash Generator: MD5, SHA-1, SHA-256, SHA-512, HMAC',
    category: 'generate',
    icon: 'hash',
    tagline: 'MD5, SHA-1, SHA-256, SHA-512 and HMAC for text and files.',
    description:
      'Free online hash generator. Compute MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes and HMAC for text or files. Everything runs locally in your browser.',
    keywords: ['hash generator', 'md5 generator', 'sha256 generator', 'sha1 hash', 'sha512 hash', 'hmac generator', 'file checksum'],
    intro:
      'Compute cryptographic hashes for text or files without uploading anything. Get MD5, SHA-1, SHA-256, SHA-384 and SHA-512 at the same time, or add a secret key to produce HMAC signatures. Compare a file checksum against the value published by its author.',
    steps: [
      'Type or paste text, or choose a file.',
      'All hashes update automatically. Toggle uppercase if you need it.',
      'Optional: enter a secret key to switch to HMAC mode.',
      'Paste an expected hash into the compare box to check for a match.',
    ],
    faq: [
      {
        q: 'Should I use MD5 or SHA-1 for passwords?',
        a: 'No. Both are broken for security purposes and fast to brute-force. Use a slow password hashing function such as Argon2, bcrypt or scrypt. MD5 and SHA-1 remain fine for checksums.',
      },
      {
        q: 'Are my files uploaded?',
        a: 'No. Files are read and hashed locally by your browser.',
      },
      {
        q: 'What is HMAC?',
        a: 'HMAC combines a hash function with a secret key to prove that a message is authentic and unchanged. It is used in webhook signatures and JWT HS256 tokens.',
      },
    ],
    related: ['jwt-decoder', 'base64-encoder-decoder', 'uuid-generator'],
  },
  {
    slug: 'unix-timestamp-converter',
    name: 'Unix Timestamp Converter',
    seoTitle: 'Unix Timestamp Converter: Epoch to Date and Back',
    category: 'decode',
    icon: 'clock',
    tagline: 'Convert epoch seconds or milliseconds to dates and back.',
    description:
      'Free Unix timestamp converter. Convert epoch seconds or milliseconds to human-readable dates and back, in UTC or any time zone, with a live clock and code snippets.',
    keywords: ['unix timestamp converter', 'epoch converter', 'timestamp to date', 'date to timestamp', 'epoch time', 'current unix time'],
    intro:
      'See the current Unix time ticking live, convert any timestamp to a readable date, or turn a date into an epoch value. Seconds and milliseconds are detected automatically, and results are shown in UTC, your local time zone or any zone you choose.',
    steps: [
      'Paste a Unix timestamp to see it as a date, or pick a date and time to get its timestamp.',
      'Choose a time zone if you need something other than your local one.',
      'Copy any format, or use the code snippets for your language.',
    ],
    faq: [
      {
        q: 'How are seconds and milliseconds told apart?',
        a: 'Values with 13 or more digits are treated as milliseconds, shorter values as seconds. You can override the guess with the unit selector.',
      },
      {
        q: 'What is the Year 2038 problem?',
        a: 'Systems that store Unix time as a signed 32-bit integer overflow on 19 January 2038. Modern 64-bit systems are not affected.',
      },
      {
        q: 'Does Unix time include leap seconds?',
        a: 'No. Unix time counts seconds since 1 January 1970 UTC and ignores leap seconds, so every day has exactly 86,400 seconds.',
      },
    ],
    related: ['jwt-decoder', 'uuid-generator', 'json-formatter'],
  },
];

export const toolMap: Record<string, Tool> = Object.fromEntries(tools.map((t) => [t.slug, t]));

export const getTool = (slug: string): Tool | undefined => toolMap[slug];
