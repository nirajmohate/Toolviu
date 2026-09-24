'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowDownUp, Download, Eraser, Upload } from 'lucide-react';
import { Button, Notice, Panel, Segmented, TextArea, Toggle } from '../ui';
import { CopyButton } from '../CopyButton';
import { ShareButton, useShareLoader } from '../ShareButton';
import { base64ToBytes, bytesToBase64, bytesToHex, toUrlSafe } from '@/lib/base64';
import { formatBytes } from '@/lib/format';

type Mode = 'encode' | 'decode';
type Source = 'text' | 'file';

const MAX_FILE = 10 * 1024 * 1024;

export default function Base64Tool() {
  const [source, setSource] = useState<Source>('text');
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [wrap, setWrap] = useState(false);
  const deferred = useDeferredValue(input);

  const [file, setFile] = useState<{ name: string; type: string; size: number; b64: string } | null>(null);
  const [fileError, setFileError] = useState('');

  const { error: shareError } = useShareLoader<{ mode: Mode; input: string; urlSafe?: boolean }>('base64-encoder-decoder', (p) => {
    setMode(p.mode ?? 'encode');
    setInput(p.input ?? '');
    setUrlSafe(Boolean(p.urlSafe));
  });

  const result = useMemo(() => {
    if (!deferred) return { text: '', error: '', note: '', bytes: null as Uint8Array | null };
    if (mode === 'encode') {
      let out = bytesToBase64(new TextEncoder().encode(deferred));
      if (urlSafe) out = toUrlSafe(out);
      else if (wrap) out = out.replace(/(.{76})/g, '$1\n').trimEnd();
      return { text: out, error: '', note: '', bytes: null };
    }
    const decoded = base64ToBytes(deferred);
    if (!decoded.ok) return { text: '', error: decoded.message, note: '', bytes: null };
    try {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(decoded.bytes), error: '', note: '', bytes: decoded.bytes };
    } catch {
      return { text: bytesToHex(decoded.bytes), error: '', note: 'The decoded data is not valid UTF-8 text, so it is shown as hex. Download it to save the raw bytes.', bytes: decoded.bytes };
    }
  }, [deferred, mode, urlSafe, wrap]);

  function swap() {
    if (!result.text || result.error) {
      setMode(mode === 'encode' ? 'decode' : 'encode');
      return;
    }
    setInput(result.text);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  }

  async function onFile(f: File | undefined) {
    setFileError('');
    setFile(null);
    if (!f) return;
    if (f.size > MAX_FILE) return setFileError(`That file is ${formatBytes(f.size)}. The limit is ${formatBytes(MAX_FILE)}.`);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      setFile({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, b64: bytesToBase64(buf) });
    } catch {
      setFileError('The file could not be read.');
    }
  }

  function downloadBytes() {
    if (!result.bytes) return;
    const url = URL.createObjectURL(new Blob([result.bytes as BlobPart]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decoded.bin';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const dataUri = file ? `data:${file.type};base64,${file.b64}` : '';

  return (
    <div className="space-y-4">
      <Segmented<Source>
        label="Input type"
        value={source}
        onChange={setSource}
        options={[
          { value: 'text', label: 'Text' },
          { value: 'file', label: 'File to Base64' },
        ]}
      />
      {shareError ? <Notice kind="error">{shareError}</Notice> : null}

      {source === 'text' ? (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Segmented<Mode>
              label="Direction"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'encode', label: 'Encode' },
                { value: 'decode', label: 'Decode' },
              ]}
            />
            {mode === 'encode' ? (
              <>
                <Toggle checked={urlSafe} onChange={setUrlSafe} label="URL-safe (- and _, no padding)" />
                <Toggle checked={wrap && !urlSafe} onChange={setWrap} label="Wrap at 76 characters" />
              </>
            ) : (
              <span className="text-sm text-muted">Standard and URL-safe Base64 are both accepted.</span>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
            <Panel
              title={mode === 'encode' ? 'Text' : 'Base64'}
              actions={
                <Button size="sm" variant="ghost" onClick={() => setInput('')} disabled={!input}>
                  <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
                </Button>
              }
            >
              <div className="p-3">
                <TextArea aria-label="Input" rows={10} value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === 'encode' ? 'Type or paste text to encode. Emoji and accents are fine.' : 'Paste Base64 to decode'} className="!h-64 break-all !whitespace-pre-wrap" />
              </div>
            </Panel>
            <div className="flex justify-center lg:pt-24">
              <Button onClick={swap} aria-label="Swap input and output" title="Use the output as the new input and flip direction">
                <ArrowDownUp className="h-4 w-4 rotate-90" aria-hidden />
              </Button>
            </div>
            <Panel
              title={mode === 'encode' ? 'Base64' : 'Text'}
              actions={
                <>
                  <CopyButton text={result.text} disabled={!result.text} />
                  {mode === 'decode' && result.bytes ? (
                    <Button size="sm" onClick={downloadBytes}>
                      <Download className="h-3.5 w-3.5" aria-hidden /> Download
                    </Button>
                  ) : null}
                  {mode === 'encode' ? <ShareButton tool="base64-encoder-decoder" getPayload={() => ({ mode, input, urlSafe })} disabled={!input} /> : null}
                </>
              }
            >
              <div className="p-3">
                <TextArea aria-label="Output" rows={10} value={result.text} readOnly placeholder="The result appears here" className="!h-64 break-all !whitespace-pre-wrap" />
              </div>
            </Panel>
          </div>
          {result.error ? <Notice kind="error">{result.error}</Notice> : null}
          {result.note ? <Notice>{result.note}</Notice> : null}
        </>
      ) : (
        <Panel title="File to Base64">
          <div className="space-y-4 p-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-10 text-center text-sm text-muted transition-colors hover:border-accent hover:text-ink">
              <Upload className="h-6 w-6" aria-hidden />
              <span>Choose a file (up to {formatBytes(MAX_FILE)}). It is read in your browser and never uploaded.</span>
              <input type="file" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            {fileError ? <Notice kind="error">{fileError}</Notice> : null}
            {file ? (
              <div className="space-y-4">
                <p className="text-sm">
                  <span className="font-medium">{file.name}</span> <span className="text-muted">({file.type}, {formatBytes(file.size)}, Base64 length {file.b64.length.toLocaleString()})</span>
                </p>
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dataUri} alt="Preview of the selected file" className="max-h-48 rounded-md border border-line" />
                ) : null}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">Data URI</span>
                    <CopyButton text={dataUri} />
                  </div>
                  <TextArea aria-label="Data URI" readOnly rows={4} value={dataUri.length > 20000 ? `${dataUri.slice(0, 20000)}\u2026 (preview truncated, Copy has the full value)` : dataUri} className="break-all !whitespace-pre-wrap" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">Raw Base64</span>
                    <CopyButton text={file.b64} />
                  </div>
                  <TextArea aria-label="Raw Base64" readOnly rows={4} value={file.b64.length > 20000 ? `${file.b64.slice(0, 20000)}\u2026 (preview truncated, Copy has the full value)` : file.b64} className="break-all !whitespace-pre-wrap" />
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      )}
    </div>
  );
}
