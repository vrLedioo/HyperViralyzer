'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Play, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api, setToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // single-use token: never fire twice
    ran.current = true;

    if (!token) {
      setStatus('error');
      setError('Missing verification token. Use the link from your email, or request a new one.');
      return;
    }

    (async () => {
      try {
        const res = await api<{ access_token: string }>('/api/auth/verify-email', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ token }),
        });
        setToken(res.access_token);
        await refresh();
        setStatus('success');
        setTimeout(() => router.push('/app'), 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'This verification link is invalid or has expired.');
      }
    })();
  }, [token, refresh, router]);

  const handleResend = async () => {
    setResent(true);
    try {
      await api('/api/auth/resend-verification', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email }),
      });
    } catch {
      /* generic response; ignore */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-3xl border border-black/5 shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hyperyzer</h1>
        </div>

        {status === 'verifying' && (
          <div className="text-center py-4">
            <Loader2 className="w-14 h-14 text-pink-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Verifying your email…</h2>
            <p className="text-slate-500 font-medium">Just a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Email verified!</h2>
            <p className="text-slate-500 font-medium">Taking you to your dashboard…</p>
          </div>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Verification failed</h2>
            <div className="my-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-red-800 text-sm font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
            <p className="text-slate-500 mb-3 font-medium text-sm">
              Enter your email and we&rsquo;ll send a fresh verification link.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50/60 border-2 border-slate-200 focus:border-pink-500 focus:bg-white outline-none font-semibold text-slate-900 transition-all"
              />
              <button
                onClick={handleResend}
                disabled={resent || !email}
                className="bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold px-4 rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {resent ? 'Sent ✓' : <>Resend <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-6 text-center">
              <Link href="/login" className="hover:text-slate-600">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-400 font-semibold">Loading…</div></div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
