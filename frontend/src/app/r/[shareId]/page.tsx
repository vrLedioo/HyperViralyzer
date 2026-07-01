import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Play, Lock, Sparkles, Quote, ArrowRight } from 'lucide-react';
import { getReport, gradeFor, overallScore } from './report';

// Public, sanitized report page — the shareable "grade card". Anyone with the
// link sees the scores + verdict + one hook rewrite; everything else is the
// signup hook. Revoked/unknown links 404.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const report = await getReport(shareId);
  if (!report) return { title: 'Report not found — Hyperyzer', robots: { index: false } };
  const overall = overallScore(report);
  const { grade } = gradeFor(overall);
  const title = `${report.title} — graded ${grade} (${overall}/100) on Hyperyzer`;
  const description = report.verdict
    ? `AI verdict: ${report.verdict} Get your video graded free at hyperyzer.com.`
    : 'AI-scored hook, retention & viral potential. Get your video graded free at hyperyzer.com.';
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-bold text-slate-600">{label}</span>
        <span className="text-sm font-black text-slate-900">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const report = await getReport(shareId);
  if (!report) notFound();

  const overall = overallScore(report);
  const { grade, word } = gradeFor(overall);
  const locked = report.locked || {};
  const lockedBits: string[] = [];
  if (locked.hook_rewrites) lockedBits.push(`${locked.hook_rewrites} more hook rewrite${locked.hook_rewrites > 1 ? 's' : ''}`);
  if (locked.title_suggestions) lockedBits.push(`${locked.title_suggestions} title idea${locked.title_suggestions > 1 ? 's' : ''}`);
  if (locked.caption) lockedBits.push('a ready-to-post caption');
  if (locked.retention_risks) lockedBits.push(`${locked.retention_risks} retention fix${locked.retention_risks > 1 ? 'es' : ''}`);
  if (locked.hashtags) lockedBits.push(`${locked.hashtags} hashtags`);
  if (locked.best_times) lockedBits.push('the best time to post');

  const ring = 2 * Math.PI * 30;

  return (
    <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-8 py-10 text-slate-900">
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Hyperyzer</span>
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          Grade my video free
        </Link>
      </div>

      {/* Grade card */}
      <div className="rounded-3xl bg-slate-900 text-white p-7 sm:p-8 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          AI report · {report.kind === 'video' ? 'video' : 'idea'}
          {report.platform ? ` · ${report.platform}` : ''}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight break-words">{report.title}</h1>

        <div className="mt-6 flex items-center gap-6">
          <div className="relative w-[84px] h-[84px] shrink-0">
            <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="pub-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <circle cx="38" cy="38" r="30" fill="none" stroke="#334155" strokeWidth="7" />
              <circle
                cx="38" cy="38" r="30" fill="none" stroke="url(#pub-grad)" strokeWidth="7"
                strokeLinecap="round" strokeDasharray={ring}
                strokeDashoffset={ring * (1 - Math.min(100, overall) / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black leading-none">{grade}</span>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">{overall}/100</span>
            </div>
          </div>
          <div>
            <p className="text-lg font-black">{word}</p>
            {report.verdict && (
              <p className="mt-1 text-sm font-medium text-slate-300 leading-relaxed">
                {report.verdict}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 space-y-4 rounded-2xl bg-white/95 p-5 text-slate-900">
          <ScoreRow label="Hook" value={report.hook_score} />
          <ScoreRow label="Retention" value={report.retention_score} />
          <ScoreRow label="Viral potential" value={report.viral_score} />
        </div>
      </div>

      {/* Proof of value: one rewritten hook */}
      {report.hook_teaser && (
        <div className="mt-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-black/5 shadow-sm p-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-pink-600">
            <Sparkles className="w-3.5 h-3.5" /> Stronger hook — written by the AI
          </p>
          <p className="mt-3 flex gap-2 text-lg font-bold leading-snug">
            <Quote className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
            {report.hook_teaser}
          </p>
        </div>
      )}

      {/* The locked rest of the report */}
      {lockedBits.length > 0 && (
        <div className="mt-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-black/5 shadow-sm p-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Lock className="w-3.5 h-3.5" /> Also in the full report
          </p>
          <p className="mt-3 font-semibold text-slate-700 blur-[3px] select-none" aria-hidden>
            {lockedBits.join(' · ')}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {lockedBits.join(', ')} — free when you analyze your own video.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold shadow-lg shadow-pink-500/25 hover:opacity-95 transition-opacity"
          >
            Analyze my video free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <p className="mt-8 text-center text-sm font-medium text-slate-500">
        Scored by{' '}
        <Link href="/" className="font-bold text-pink-600 hover:underline">
          Hyperyzer
        </Link>{' '}
        — AI grades your video, rewrites your hook, and tells you when to post.
      </p>
    </div>
  );
}
