import { ImageResponse } from 'next/og';
import { getTool, tools } from '@/lib/tools';
import { site } from '@/lib/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Free online developer tool';

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B1F17', color: '#E7F3EC', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 700, color: '#fff' }}>{'{ }'}</div>
          <div style={{ fontSize: 38, fontWeight: 700 }}>{site.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>{tool?.name ?? 'Developer tool'}</div>
          <div style={{ fontSize: 34, color: '#8DA398', maxWidth: 980 }}>{tool?.tagline ?? site.tagline}</div>
        </div>
        <div style={{ fontSize: 28, color: '#34D399' }}>Free. No login. Runs in your browser.</div>
      </div>
    ),
    size,
  );
}
