import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export function DevModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (isSupabaseConfigured || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0">
      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
      <p className="flex-1 text-xs text-amber-800">
        <span className="font-semibold">Dev Mode</span> — Supabase not configured. Using mock admin account.
        Set <code className="bg-amber-100 px-1 rounded font-mono">VITE_SUPABASE_URL</code> and{' '}
        <code className="bg-amber-100 px-1 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> in{' '}
        <code className="bg-amber-100 px-1 rounded font-mono">.env</code> to connect.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}
