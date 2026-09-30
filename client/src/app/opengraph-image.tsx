import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B1F17', color: '#E7F3EC', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: '#fff' }}>{'{ }'}</div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{site.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 950 }}>Free developer tools that run in your browser</div>
          <div style={{ fontSize: 32, color: '#8DA398' }}>JSON, JWT, regex, API tester, CSS and more. No login.</div>
        </div>
      </div>
    ),
    size,
  );
}
