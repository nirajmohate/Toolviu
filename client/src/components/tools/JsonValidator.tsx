'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, Eraser, FileJson, XCircle } from 'lucide-react';
import { Button, Notice, Panel, Toggle } from '../ui';
import { CodeArea } from '../CodeArea';
import { ShareButton, useShareLoader } from '../ShareButton';
import { analyze, errorContext, SAMPLE_JSON, tryParse } from '@/lib/json';
import { formatBytes, readClipboard, utf8Length } from '@/lib/format';

const SAMPLE_SCHEMA = `{
  "type": "object",
  "required": ["id", "name", "tags"],
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "name": { "type": "string", "minLength": 2 },
    "active": { "type": "boolean" },
    "tags": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
  }
}`;

type SchemaResult = { state: 'idle' } | { state: 'ok' } | { state: 'invalid'; errors: string[] } | { state: 'bad-schema'; message: string };

export default function JsonValidator() {
  const [input, setInput] = useState('');
  const [useSchema, setUseSchema] = useState(false);
  const [schema, setSchema] = useState('');
  const [schemaResult, setSchemaResult] = useState<SchemaResult>({ state: 'idle' });
  const deferred = useDeferredValue(input);
  const deferredSchema = useDeferredValue(schema);

  const { error: shareError } = useShareLoader<{ input: string; schema?: string }>('json-validator', (p) => {
    setInput(p.input ?? '');
    if (p.schema) {
      setSchema(p.schema);
      setUseSchema(true);
    }
  });

  const parsed = useMemo(() => (deferred.trim() ? tryParse(deferred) : null), [deferred]);
  const stats = useMemo(() => (parsed && parsed.ok ? analyze(parsed.node) : null), [parsed]);

  useEffect(() => {
    if (!useSchema || !parsed || !parsed.ok || !deferredSchema.trim()) {
      setSchemaResult({ state: 'idle' });
      return;
    }
    let cancelled = false;
    (async () => {
      let schemaObj: unknown;
      try {
        schemaObj = JSON.parse(deferredSchema);
      } catch (e) {
        const t = tryParse(deferredSchema);
        if (!cancelled) setSchemaResult({ state: 'bad-schema', message: t.ok ? 'Schema is not valid JSON.' : `Schema JSON error at line ${t.error.line}, column ${t.error.column}: ${t.error.message}` });
        return;
      }
      try {
        const mod = (await import('ajv')) as unknown as { default?: unknown };
        const Ajv = ((mod.default as { default?: unknown } | undefined)?.default ?? mod.default ?? mod) as new (o: object) => {
          compile: (s: unknown) => ((d: unknown) => boolean) & { errors?: { instancePath: string; message?: string; params?: Record<string, unknown> }[] | null };
        };
        const ajv = new Ajv({ allErrors: true, strict: false });
        const validate = ajv.compile(schemaObj);
        const ok = validate(JSON.parse(deferred));
        if (cancelled) return;
        if (ok) setSchemaResult({ state: 'ok' });
        else {
          const errors = (validate.errors ?? []).slice(0, 50).map((e) => {
            // ajv already names missing properties in its message; unexpected ones it does not.
            const extra = e.params && 'additionalProperty' in e.params ? ` (${String(e.params.additionalProperty)})` : '';
            return `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}${extra}`;
          });
          setSchemaResult({ state: 'invalid', errors });
        }
      } catch (e) {
        if (!cancelled) setSchemaResult({ state: 'bad-schema', message: e instanceof Error ? e.message : 'The schema could not be compiled.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useSchema, parsed, deferred, deferredSchema]);

  async function paste() {
    const text = await readClipboard();
    if (text !== null) setInput(text);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Toggle checked={useSchema} onChange={setUseSchema} label="Also validate against a JSON Schema" />
        <span className="text-sm text-muted">Validation runs as you type.</span>
      </div>
      {shareError ? <Notice kind="error">{shareError}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel
            title="JSON to validate"
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={paste}>
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Paste
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLE_JSON); if (useSchema && !schema) setSchema(SAMPLE_SCHEMA); }}>
                  <FileJson className="h-3.5 w-3.5" aria-hidden /> Sample
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setInput('')} disabled={!input}>
                  <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
                </Button>
                <ShareButton tool="json-validator" getPayload={() => ({ input, schema: useSchema ? schema : undefined })} disabled={!input.trim()} />
              </>
            }
          >
            <CodeArea ariaLabel="JSON input" value={input} onChange={setInput} placeholder="Paste JSON here" errorLine={parsed && !parsed.ok ? parsed.error.line : null} className={useSchema ? '!h-56 md:!h-72' : ''} />
          </Panel>
          {useSchema ? (
            <Panel
              title="JSON Schema (draft-07)"
              actions={
                <Button size="sm" variant="ghost" onClick={() => setSchema(SAMPLE_SCHEMA)}>
                  <FileJson className="h-3.5 w-3.5" aria-hidden /> Sample schema
                </Button>
              }
            >
              <CodeArea ariaLabel="JSON Schema" value={schema} onChange={setSchema} placeholder="Paste a JSON Schema here" className="!h-56 md:!h-64" />
            </Panel>
          ) : null}
        </div>

        <Panel title="Result" className="self-start">
          <div className="space-y-4 p-4" aria-live="polite">
            {!parsed ? (
              <p className="text-muted">Paste JSON on the left to check it. Errors show the exact line and column.</p>
            ) : parsed.ok ? (
              <>
                <div className="flex items-center gap-2 text-ok">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  <p className="font-semibold">Valid JSON</p>
                </div>
                {stats ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    {[
                      ['Size', formatBytes(utf8Length(deferred))],
                      ['Depth', String(stats.maxDepth)],
                      ['Keys', String(stats.keys)],
                      ['Objects', String(stats.objects)],
                      ['Arrays', String(stats.arrays)],
                      ['Strings', String(stats.strings)],
                      ['Numbers', String(stats.numbers)],
                      ['Booleans', String(stats.booleans)],
                      ['Nulls', String(stats.nulls)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-muted">{k}</dt>
                        <dd className="font-mono text-base">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 text-danger">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">
                      Invalid JSON at line {parsed.error.line}, column {parsed.error.column}
                    </p>
                    <p className="text-sm">{parsed.error.message}.</p>
                  </div>
                </div>
                <pre className="code scroll-thin overflow-x-auto rounded-md border border-line bg-sunken p-3">{errorContext(deferred, parsed.error)}</pre>
              </>
            )}

            {useSchema && parsed?.ok ? (
              <div className="border-t border-line pt-4">
                <h3 className="mb-2 font-sans text-sm font-semibold tracking-normal">Schema check</h3>
                {schemaResult.state === 'idle' ? <p className="text-sm text-muted">Paste a schema to check the structure.</p> : null}
                {schemaResult.state === 'ok' ? <Notice kind="success">The JSON matches the schema.</Notice> : null}
                {schemaResult.state === 'bad-schema' ? <Notice kind="error">{schemaResult.message}</Notice> : null}
                {schemaResult.state === 'invalid' ? (
                  <Notice kind="error">
                    <p className="font-medium">{schemaResult.errors.length} schema {schemaResult.errors.length === 1 ? 'error' : 'errors'}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 font-mono text-[13px]">
                      {schemaResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
