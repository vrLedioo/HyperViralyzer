import { ImageResponse } from 'next/og';
import { getReport, gradeFor, overallScore } from './report';

// The shareable scorecard: when a creator drops their /r/<id> link in a chat or
// comment section, it unfurls as a branded grade card (also used for Twitter).
export const alt = 'Hyperyzer AI video report';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const scoreRow = (label: string, value: number) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: 240 }}>
    <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#94a3b8' }}>{label}</div>
    <div style={{ display: 'flex', fontSize: 54, fontWeight: 900, color: '#ffffff' }}>{value}</div>
    <div style={{ display: 'flex', width: 200, height: 10, background: '#334155', borderRadius: 5 }}>
      <div
        style={{
          display: 'flex',
          width: Math.max(8, Math.min(200, value * 2)),
          height: 10,
          borderRadius: 5,
          background: 'linear-gradient(90deg, #ec4899, #f97316)',
        }}
      />
    </div>
  </div>
);

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const report = await getReport(shareId);

  if (!report) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
            color: '#fff', fontSize: 88, fontWeight: 900, fontFamily: 'sans-serif',
          }}
        >
          Hyperyzer
        </div>
      ),
      { ...size },
    );
  }

  const overall = overallScore(report);
  const { grade, word } = gradeFor(overall);
  const title = report.title.length > 70 ? `${report.title.slice(0, 67)}…` : report.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#0f172a', color: '#ffffff', fontFamily: 'sans-serif',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>
            Hyperyzer
          </div>
          <div
            style={{
              display: 'flex', fontSize: 26, fontWeight: 700, color: '#f9a8d4',
              textTransform: 'uppercase', letterSpacing: 4,
            }}
          >
            AI video report
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 40, alignItems: 'center', gap: 56, flexGrow: 1 }}>
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', width: 300, height: 300, borderRadius: 150,
              background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', fontSize: 130, fontWeight: 900, lineHeight: 1 }}>{grade}</div>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, opacity: 0.95 }}>{overall}/100</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, maxWidth: 700 }}>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 900, lineHeight: 1.2, wordBreak: 'break-word' }}>{title}</div>
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#f9a8d4', marginTop: 12 }}>
              {word}
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
              {scoreRow('Hook', report.hook_score)}
              {scoreRow('Retention', report.retention_score)}
              {scoreRow('Viral', report.viral_score)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#94a3b8' }}>
          Get your video graded free — hyperyzer.com
        </div>
      </div>
    ),
    { ...size },
  );
}
