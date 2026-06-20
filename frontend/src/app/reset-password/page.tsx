'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Play, Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Missing or invalid reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please request a new link.');
    } finally {
      setLoading(false);
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

        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Password updated!</h2>
            <p className="text-slate-500 font-medium">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Set new password</h2>
            <p className="text-slate-500 mb-6 font-medium">
              Choose a strong password of at least 8 characters.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-red-800 text-sm font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (8+ chars)"
                  disabled={!token}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/60 border-2 border-slate-200 focus:border-pink-500 focus:bg-white outline-none font-semibold text-slate-900 transition-all disabled:opacity-50"
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={!token}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/60 border-2 border-slate-200 focus:border-pink-500 focus:bg-white outline-none font-semibold text-slate-900 transition-all disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold py-3 rounded-xl shadow-[0_8px_20px_rgba(236,72,153,0.25)] hover:shadow-[0_8px_25px_rgba(236,72,153,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Updating…' : <>Update password <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-sm text-slate-400 mt-6 text-center">
              <Link href="/forgot-password" className="hover:text-slate-600">Request a new link</Link>
              {' · '}
              <Link href="/login" className="hover:text-slate-600">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-400 font-semibold">Loading…</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
