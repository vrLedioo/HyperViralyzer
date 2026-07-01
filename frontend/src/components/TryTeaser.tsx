'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Lock, ArrowRight, AlertCircle, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';

// The 10-second taste: one free idea analysis on the landing page, no signup.
// Backend: POST /api/try (IP rate-limited, teaser-sized response).

interface TryResult {
  hook_score: number;
  retention_score: number;
  viral_score: number;
  verdict: string;
  hook_teaser: string;
  locked: {
    hook_rewrites?: number;
    title_suggestions?: number;
    caption?: boolean;
    retention_risks?: number;
    hashtags?: number;
    best_times?: number;
  };
}

function overall(r: TryResult): number {
  return Math.round(0.4 * r.hook_score + 0.3 * r.retention_score + 0.3 * r.viral_score);
}
function gradeFor(v: number): string {
  if (v >= 85) return 'A+';
  if (v >= 75) return 'A';
  if (v >= 65) return 'B';
  if (v >= 55) return 'C';
  if (v >= 45) return 'D';
  return 'F';
}

export function TryTeaser() {
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TryResult | null>(null);

  const run = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !script.trim() || loading) return;
    setLoading(true); setError('');
    try {
      const data = await api<TryResult>('/api/try', {
        method: 'POST', auth: false,
        body: JSON.stringify({ title, script }),
      });
      setResult(data);
    } catch (err: any) {
      if (err?.status === 429) {
        setError("You've used today's free checks — create a free account and get 10 full reports.");
      } else {
        setError(err?.message || 'Something went wrong. Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const locked = result?.locked || {};
  const lockedCount =
    (locked.hook_rewrites || 0) + (locked.title_suggestions || 0) +
    (locked.caption ? 1 : 0) + (locked.retention_risks || 0) +
    (locked.hashtags || 0) + (locked.best_times || 0);

  return (
    <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-xl rounded-3xl border border-black/5 shadow-xl p-6 sm:p-8 text-left">
      {!result ? (
        <form onSubmit={run}>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Your video title — e.g. I Survived 100 Days in Hardcore Minecraft"
            className="w-full px-4 py-3 rounded-xl bg-slate-50/70 border-2 border-slate-200 focus:border-pink-500 focus:bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all outline-none"
          />
          <textarea
            value={script} onChange={(e) => setScript(e.target.value)} required rows={3}
            placeholder="Paste your hook or the first lines of your script…"
            className="mt-3 w-full px-4 py-3 rounded-xl bg-slate-50/70 border-2 border-slate-200 focus:border-pink-500 focus:bg-white text-slate-900 placeholder-slate-400 font-medium leading-relaxed resize-none transition-all outline-none"
          />
          {error && (
            <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          <button
            type="submit" disabled={loading || !title.trim() || !script.trim()}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-pink-500 to-orange-500 shadow-[0_10px_30px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_35px_rgba(236,72,153,0.45)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100 cursor-pointer"
          >
            {loading ? 'Grading…' : <>Grade it free — no signup <Sparkles className="w-5 h-5" /></>}
          </button>
        </form>
      ) : (
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <p className="font-bold text-slate-800 truncate pr-3">&ldquo;{title}&rdquo;</p>
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg">
              {gradeFor(overall(result))} · {overall(result)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4">
            {[
              { l: 'Hook', v: result.hook_score, c: 'bg-pink-500' },
              { l: 'Retention', v: result.retention_score, c: 'bg-emerald-500' },
              { l: 'Viral', v: result.viral_score, c: 'bg-orange-500' },
            ].map((s) => (
              <div key={s.l} className="bg-slate-50/80 rounded-2xl p-4 border border-black/5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.l}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{s.v}<span className="text-base text-slate-400">/100</span></p>
                <div className="mt-2 h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.c}`} style={{ width: `${s.v}%` }} />
                </div>
              </div>
            ))}
          </div>
          {result.verdict && (
            <p className="mt-4 text-slate-700 font-medium leading-relaxed">
              <span className="font-bold text-slate-900">Verdict:</span> {result.verdict}
            </p>
          )}
          {result.hook_teaser && (
            <div className="mt-4 bg-pink-50/70 rounded-2xl p-4 border border-pink-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-3 h-3" /> Stronger hook — written for this exact video
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-2 leading-relaxed">&ldquo;{result.hook_teaser}&rdquo;</p>
            </div>
          )}
          {lockedCount > 0 && (
            <div className="mt-4 rounded-2xl p-4 border border-slate-200 bg-slate-50/80">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> {lockedCount} more fixes in your full report
              </p>
              <p className="text-sm font-semibold text-slate-600 mt-2 blur-[3px] select-none" aria-hidden>
                More hook rewrites, better titles, a ready caption, retention fixes, hashtags and your best time to post.
              </p>
            </div>
          )}
          <Link
            href="/signup"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-pink-500 to-orange-500 shadow-[0_10px_30px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_35px_rgba(236,72,153,0.45)] hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            Unlock the full report free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-3 text-center text-xs text-slate-500 font-medium">
            10 free credits on signup · no credit card ·{' '}
            <button onClick={() => { setResult(null); setTitle(''); setScript(''); }} className="font-bold text-pink-600 hover:underline cursor-pointer">
              grade another idea
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
