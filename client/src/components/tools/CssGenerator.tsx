'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Notice, Panel, Segmented, Select, Toggle } from '../ui';
import { CopyButton } from '../CopyButton';
import { ShareButton, useShareLoader } from '../ShareButton';

type Tab = 'shadow' | 'gradient' | 'radius' | 'glass';

type Layer = { x: number; y: number; blur: number; spread: number; color: string; alpha: number; inset: boolean };
type Stop = { color: string; pos: number };
type GradientState = { kind: 'linear' | 'radial' | 'conic'; angle: number; shape: 'circle' | 'ellipse'; stops: Stop[] };
type RadiusState = { unit: 'px' | '%'; elliptical: boolean; h: [number, number, number, number]; v: [number, number, number, number] };
type GlassState = { tint: string; bgAlpha: number; blur: number; saturate: number; borderAlpha: number; radius: number };

type All = { tab: Tab; layers: Layer[]; gradient: GradientState; radius: RadiusState; glass: GlassState; pageBg: string };

const DEFAULTS: All = {
  tab: 'shadow',
  layers: [
    { x: 0, y: 1, blur: 2, spread: 0, color: '#0e192b', alpha: 0.08, inset: false },
    { x: 0, y: 12, blur: 32, spread: -8, color: '#0e192b', alpha: 0.25, inset: false },
  ],
  gradient: { kind: 'linear', angle: 135, shape: 'circle', stops: [{ color: '#2b3aff', pos: 0 }, { color: '#ff7ab8', pos: 100 }] },
  radius: { unit: 'px', elliptical: false, h: [24, 24, 24, 24], v: [24, 24, 24, 24] },
  glass: { tint: '#ffffff', bgAlpha: 0.18, blur: 14, saturate: 160, borderAlpha: 0.35, radius: 20 },
  pageBg: '#e9edf6',
};

const SHADOW_PRESETS: Record<string, Layer[]> = {
  Soft: [{ x: 0, y: 10, blur: 30, spread: -10, color: '#0e192b', alpha: 0.3, inset: false }],
  Layered: DEFAULTS.layers,
  'Hard offset': [{ x: 8, y: 8, blur: 0, spread: 0, color: '#0e192b', alpha: 1, inset: false }],
  Glow: [{ x: 0, y: 0, blur: 28, spread: 2, color: '#2b3aff', alpha: 0.55, inset: false }],
  Inset: [{ x: 0, y: 2, blur: 8, spread: 0, color: '#0e192b', alpha: 0.35, inset: true }],
};

function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const a = Math.round(alpha * 100) / 100;
  return a >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${a})`;
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const id = `sl-${label.replace(/\s+/g, '-').toLowerCase()}-${min}-${max}`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-medium text-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-ink">
          {value}
          {unit}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted">
      {label}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-line bg-surface p-0.5" />
      <span className="font-mono text-ink">{value}</span>
    </label>
  );
}

function Output({ css }: { css: string }) {
  return (
    <div className="border-t border-line">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted">CSS</span>
        <CopyButton text={css} />
      </div>
      <pre className="code scroll-thin overflow-x-auto whitespace-pre-wrap break-all px-3 pb-3">{css}</pre>
    </div>
  );
}

export default function CssGenerator() {
  const [s, setS] = useState<All>(DEFAULTS);
  const set = <K extends keyof All>(key: K, value: All[K]) => setS((cur) => ({ ...cur, [key]: value }));
  const { error: shareError } = useShareLoader<All>('css-generator', (p) => setS({ ...DEFAULTS, ...p }));

  const shadowValue = useMemo(() => s.layers.map((l) => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${rgba(l.color, l.alpha)}`).join(',\n    '), [s.layers]);
  const shadowCss = `box-shadow: ${shadowValue};`;

  const gradientValue = useMemo(() => {
    const g = s.gradient;
    const stops = [...g.stops].sort((a, b) => a.pos - b.pos).map((st) => `${st.color} ${st.pos}%`).join(', ');
    if (g.kind === 'linear') return `linear-gradient(${g.angle}deg, ${stops})`;
    if (g.kind === 'radial') return `radial-gradient(${g.shape}, ${stops})`;
    return `conic-gradient(from ${g.angle}deg, ${stops})`;
  }, [s.gradient]);
  const gradientCss = `background: ${gradientValue};`;

  const radiusValue = useMemo(() => {
    const r = s.radius;
    const fmt = (arr: number[]) => arr.map((n) => `${n}${r.unit}`).join(' ');
    return r.elliptical ? `${fmt(r.h)} / ${fmt(r.v)}` : fmt(r.h);
  }, [s.radius]);
  const radiusCss = `border-radius: ${radiusValue};`;

  const glassCss = useMemo(() => {
    const g = s.glass;
    const f = `blur(${g.blur}px) saturate(${g.saturate}%)`;
    return `background: ${rgba(g.tint, g.bgAlpha)};\nbackdrop-filter: ${f};\n-webkit-backdrop-filter: ${f};\nborder: 1px solid ${rgba(g.tint, g.borderAlpha)};\nborder-radius: ${g.radius}px;`;
  }, [s.glass]);

  const updateLayer = (i: number, patch: Partial<Layer>) => set('layers', s.layers.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const updateStop = (i: number, patch: Partial<Stop>) => set('gradient', { ...s.gradient, stops: s.gradient.stops.map((st, idx) => (idx === i ? { ...st, ...patch } : st)) });
  const corners = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];
  const setCorner = (axis: 'h' | 'v', i: number, val: number) => {
    const next = [...s.radius[axis]] as [number, number, number, number];
    next[i] = val;
    const patch: Partial<RadiusState> = { [axis]: next };
    if (!s.radius.elliptical && axis === 'h') patch.v = next;
    set('radius', { ...s.radius, ...patch });
  };

  return (
    <div className="space-y-4">
      {shareError ? <Notice kind="error">{shareError}</Notice> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Tab>
          label="Generator"
          value={s.tab}
          onChange={(v) => set('tab', v)}
          options={[
            { value: 'shadow', label: 'Box shadow' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'radius', label: 'Border radius' },
            { value: 'glass', label: 'Glass' },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setS({ ...DEFAULTS, tab: s.tab })}>
            Reset
          </Button>
          <ShareButton tool="css-generator" getPayload={() => s} />
        </div>
      </div>

      {s.tab === 'shadow' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel
            title="Layers"
            actions={
              <Button size="sm" onClick={() => set('layers', [...s.layers, { x: 0, y: 4, blur: 12, spread: 0, color: '#0e192b', alpha: 0.2, inset: false }])} disabled={s.layers.length >= 6}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> Add layer
              </Button>
            }
          >
            <div className="space-y-5 p-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
                {Object.entries(SHADOW_PRESETS).map(([name, layers]) => (
                  <Button key={name} size="sm" onClick={() => set('layers', layers)}>
                    {name}
                  </Button>
                ))}
              </div>
              {s.layers.map((l, i) => (
                <fieldset key={i} className="space-y-3 rounded-md border border-line p-3">
                  <legend className="flex items-center gap-2 px-1 text-xs font-medium text-muted">
                    Layer {i + 1}
                    {s.layers.length > 1 ? (
                      <button type="button" aria-label={`Remove layer ${i + 1}`} onClick={() => set('layers', s.layers.filter((_, idx) => idx !== i))} className="rounded p-1 hover:bg-sunken hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </legend>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Slider label="Offset X" value={l.x} min={-60} max={60} unit="px" onChange={(v) => updateLayer(i, { x: v })} />
                    <Slider label="Offset Y" value={l.y} min={-60} max={60} unit="px" onChange={(v) => updateLayer(i, { y: v })} />
                    <Slider label="Blur" value={l.blur} min={0} max={100} unit="px" onChange={(v) => updateLayer(i, { blur: v })} />
                    <Slider label="Spread" value={l.spread} min={-40} max={60} unit="px" onChange={(v) => updateLayer(i, { spread: v })} />
                    <Slider label="Opacity" value={l.alpha} min={0} max={1} step={0.01} onChange={(v) => updateLayer(i, { alpha: v })} />
                    <div className="flex flex-col justify-end gap-2">
                      <ColorInput label="Color" value={l.color} onChange={(v) => updateLayer(i, { color: v })} />
                      <Toggle checked={l.inset} onChange={(v) => updateLayer(i, { inset: v })} label="Inset" />
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          </Panel>
          <Panel title="Preview" className="self-start">
            <div className="flex h-72 items-center justify-center rounded-none" style={{ background: s.pageBg }}>
              <div className="h-36 w-36 rounded-2xl bg-white" style={{ boxShadow: shadowValue.replace(/\n\s*/g, ' ') }} aria-label="Shadow preview" role="img" />
            </div>
            <div className="border-t border-line px-3 py-2">
              <ColorInput label="Page background" value={s.pageBg} onChange={(v) => set('pageBg', v)} />
            </div>
            <Output css={shadowCss} />
          </Panel>
        </div>
      ) : null}

      {s.tab === 'gradient' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Gradient">
            <div className="space-y-5 p-3">
              <Segmented<GradientState['kind']>
                label="Gradient type"
                value={s.gradient.kind}
                onChange={(v) => set('gradient', { ...s.gradient, kind: v })}
                options={[
                  { value: 'linear', label: 'Linear' },
                  { value: 'radial', label: 'Radial' },
                  { value: 'conic', label: 'Conic' },
                ]}
              />
              {s.gradient.kind !== 'radial' ? <Slider label={s.gradient.kind === 'linear' ? 'Angle' : 'Start angle'} value={s.gradient.angle} min={0} max={360} unit="deg" onChange={(v) => set('gradient', { ...s.gradient, angle: v })} /> : null}
              {s.gradient.kind === 'radial' ? (
                <Select aria-label="Shape" value={s.gradient.shape} onChange={(e) => set('gradient', { ...s.gradient, shape: e.target.value as 'circle' | 'ellipse' })} className="w-40">
                  <option value="circle">Circle</option>
                  <option value="ellipse">Ellipse</option>
                </Select>
              ) : null}
              <div className="space-y-3">
                {s.gradient.stops.map((st, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="color" value={st.color} onChange={(e) => updateStop(i, { color: e.target.value })} aria-label={`Color stop ${i + 1}`} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-line bg-surface p-0.5" />
                    <div className="flex-1">
                      <Slider label={`Stop ${i + 1}`} value={st.pos} min={0} max={100} unit="%" onChange={(v) => updateStop(i, { pos: v })} />
                    </div>
                    {s.gradient.stops.length > 2 ? (
                      <button type="button" aria-label={`Remove stop ${i + 1}`} onClick={() => set('gradient', { ...s.gradient, stops: s.gradient.stops.filter((_, idx) => idx !== i) })} className="rounded p-1.5 text-muted hover:bg-sunken hover:text-danger">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
                <Button size="sm" onClick={() => set('gradient', { ...s.gradient, stops: [...s.gradient.stops, { color: '#ffd84d', pos: 50 }] })} disabled={s.gradient.stops.length >= 8}>
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Add color stop
                </Button>
              </div>
            </div>
          </Panel>
          <Panel title="Preview" className="self-start">
            <div className="h-72" style={{ background: gradientValue }} role="img" aria-label="Gradient preview" />
            <Output css={gradientCss} />
          </Panel>
        </div>
      ) : null}

      {s.tab === 'radius' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Corners">
            <div className="space-y-5 p-3">
              <div className="flex flex-wrap items-center gap-4">
                <Segmented<'px' | '%'>
                  label="Unit"
                  value={s.radius.unit}
                  onChange={(v) => set('radius', { ...s.radius, unit: v })}
                  options={[
                    { value: 'px', label: 'px' },
                    { value: '%', label: '%' },
                  ]}
                />
                <Toggle
                  checked={s.radius.elliptical}
                  onChange={(v) => set('radius', { ...s.radius, elliptical: v, v: v ? s.radius.v : s.radius.h })}
                  label="Elliptical (separate vertical radii)"
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {corners.map((c, i) => (
                  <div key={c} className="space-y-3">
                    <Slider label={s.radius.elliptical ? `${c} (horizontal)` : c} value={s.radius.h[i]} min={0} max={s.radius.unit === '%' ? 100 : 160} unit={s.radius.unit} onChange={(v) => setCorner('h', i, v)} />
                    {s.radius.elliptical ? <Slider label={`${c} (vertical)`} value={s.radius.v[i]} min={0} max={s.radius.unit === '%' ? 100 : 160} unit={s.radius.unit} onChange={(v) => setCorner('v', i, v)} /> : null}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Preview" className="self-start">
            <div className="flex h-72 items-center justify-center" style={{ background: s.pageBg }}>
              <div className="h-44 w-44 bg-accent" style={{ borderRadius: radiusValue }} role="img" aria-label="Border radius preview" />
            </div>
            <Output css={radiusCss} />
          </Panel>
        </div>
      ) : null}

      {s.tab === 'glass' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Glass settings">
            <div className="space-y-4 p-3">
              <ColorInput label="Tint" value={s.glass.tint} onChange={(v) => set('glass', { ...s.glass, tint: v })} />
              <Slider label="Background opacity" value={s.glass.bgAlpha} min={0} max={1} step={0.01} onChange={(v) => set('glass', { ...s.glass, bgAlpha: v })} />
              <Slider label="Blur" value={s.glass.blur} min={0} max={40} unit="px" onChange={(v) => set('glass', { ...s.glass, blur: v })} />
              <Slider label="Saturation" value={s.glass.saturate} min={50} max={250} unit="%" onChange={(v) => set('glass', { ...s.glass, saturate: v })} />
              <Slider label="Border opacity" value={s.glass.borderAlpha} min={0} max={1} step={0.01} onChange={(v) => set('glass', { ...s.glass, borderAlpha: v })} />
              <Slider label="Corner radius" value={s.glass.radius} min={0} max={60} unit="px" onChange={(v) => set('glass', { ...s.glass, radius: v })} />
            </div>
          </Panel>
          <Panel title="Preview" className="self-start">
            <div className="relative flex h-72 items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg,#2b3aff 0%,#ff7ab8 50%,#ffd84d 100%)' }}>
              <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-white/70" />
              <div className="absolute bottom-8 right-12 h-28 w-28 rounded-full bg-[#0e192b]/70" />
              <div
                className="relative flex h-40 w-64 items-center justify-center text-sm font-medium text-white"
                style={{
                  background: rgba(s.glass.tint, s.glass.bgAlpha),
                  backdropFilter: `blur(${s.glass.blur}px) saturate(${s.glass.saturate}%)`,
                  WebkitBackdropFilter: `blur(${s.glass.blur}px) saturate(${s.glass.saturate}%)`,
                  border: `1px solid ${rgba(s.glass.tint, s.glass.borderAlpha)}`,
                  borderRadius: s.glass.radius,
                }}
              >
                Frosted glass
              </div>
            </div>
            <Output css={glassCss} />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
