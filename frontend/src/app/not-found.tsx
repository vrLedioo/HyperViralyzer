import Link from 'next/link';
import { Play } from 'lucide-react';

export const metadata = {
  title: '404 — Hyperyzer',
};

export default function NotFound() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-5">
      <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">Hyperyzer</span>
      </Link>

      <p className="text-8xl font-black text-slate-900/10 select-none">404</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-500 font-medium max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/app"
          className="px-6 py-3 rounded-xl bg-white/80 border border-black/5 text-slate-900 font-bold hover:bg-white transition-colors shadow-sm"
        >
          Open app
        </Link>
      </div>
    </div>
  );
}
