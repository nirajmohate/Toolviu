import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const Loading = () => <div className="panel h-96 animate-pulse bg-sunken/50" aria-busy="true" aria-label="Loading tool" />;
const load = (loader: () => Promise<{ default: ComponentType }>) => dynamic(loader, { loading: Loading });

// slug -> component. Each tool is code-split, so a visitor only downloads the tool they open.
export const toolComponents: Record<string, ComponentType> = {
  'json-formatter': load(() => import('./JsonFormatter')),
  'json-validator': load(() => import('./JsonValidator')),
  'jwt-decoder': load(() => import('./JwtDecoder')),
  'regex-tester': load(() => import('./RegexTester')),
  'api-tester': load(() => import('./ApiTester')),
  'css-generator': load(() => import('./CssGenerator')),
  'html-formatter': load(() => import('./HtmlFormatter')),
  'base64-encoder-decoder': load(() => import('./Base64Tool')),
  'url-encoder-decoder': load(() => import('./UrlTool')),
  'uuid-generator': load(() => import('./UuidGenerator')),
  'hash-generator': load(() => import('./HashGenerator')),
  'unix-timestamp-converter': load(() => import('./TimestampConverter')),
};
