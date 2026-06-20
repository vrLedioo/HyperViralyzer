'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'hy_storage_notice_dismissed';

export function StorageNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage blocked (private mode, etc.) — silently skip
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900/95 backdrop-blur text-white text-sm px-4 py-3 flex items-center justify-between gap-4 shadow-2xl">
      <p className="leading-snug">
        We use local storage to keep you signed in — no tracking or advertising cookies.{' '}
        <Link href="/privacy" className="underline opacity-80 hover:opacity-100" onClick={dismiss}>
          Privacy Policy
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition-colors"
        aria-label="Dismiss storage notice"
      >
        OK
      </button>
    </div>
  );
}
