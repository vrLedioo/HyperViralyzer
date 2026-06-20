'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, Download, Trash2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, API_URL, getToken } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="text-center">
          <p className="text-slate-500 font-medium mb-4">You need to be logged in to view this page.</p>
          <Link href="/login" className="text-pink-600 font-bold hover:underline">Log in</Link>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/auth/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hyperyzer-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete.toLowerCase() !== 'delete') return;
    setDeleting(true);
    setError('');
    try {
      await api('/api/auth/account', { method: 'DELETE' });
      logout();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Deletion failed. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen relative z-10 flex flex-col items-center justify-start py-12 px-5">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/app" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">Account Settings</span>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-red-800 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Profile */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-black/5 shadow-sm p-6 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h2>
          <p className="font-bold text-slate-900">{user.email}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Plan: <span className="capitalize font-bold text-slate-700">{user.plan}</span>
            {' · '}
            {user.total_credits} credit{user.total_credits === 1 ? '' : 's'}
          </p>
        </div>

        {/* Data portability */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-black/5 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-900 mb-1">Download your data</h2>
              <p className="text-sm text-slate-500 font-medium mb-4">
                Export all your account data and analysis history as a JSON file (GDPR Art. 20).
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting…' : 'Download data'}
              </button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-red-100 shadow-sm p-6">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Danger zone</h2>
          <h3 className="font-bold text-slate-900 mb-1">Delete account</h3>
          <p className="text-sm text-slate-500 font-medium mb-4">
            Permanently deletes your account, all analyses, and all data. This cannot be undone.
          </p>

          {!showDeleteForm ? (
            <button
              onClick={() => setShowDeleteForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Type <strong>delete</strong> to confirm:
              </p>
              <input
                type="text"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="delete"
                className="w-full px-4 py-2.5 rounded-xl bg-red-50 border-2 border-red-200 focus:border-red-500 outline-none font-semibold text-slate-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting || confirmDelete.toLowerCase() !== 'delete'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => { setShowDeleteForm(false); setConfirmDelete(''); }}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400 font-medium">
          <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
          {' · '}
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
        </div>
      </div>
    </div>
  );
}
