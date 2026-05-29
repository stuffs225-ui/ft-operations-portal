import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, Info, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { isSupabaseConfigured } from '../lib/supabase';

// Map raw Supabase error strings to user-friendly messages
function friendlyError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
    return 'Incorrect email or password. Please try again.';
  if (msg.includes('email not confirmed'))
    return 'Your email address has not been confirmed. Please check your inbox for the confirmation link.';
  if (msg.includes('user not found'))
    return 'No account found with that email address.';
  if (msg.includes('too many requests') || msg.includes('rate limit'))
    return 'Too many sign-in attempts. Please wait a few minutes and try again.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Network error — please check your connection and try again.';
  if (msg.includes('signup disabled') || msg.includes('signups not allowed'))
    return 'New sign-ups are currently disabled. Contact your administrator.';
  return raw;
}

export function Login() {
  const { profile, signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auth check in progress — show neutral loading screen, not the form
  if (loading) return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center">
      <Loader2 size={28} className="text-brand-400 animate-spin" />
    </div>
  );

  // Already logged in → go home
  if (profile) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) setError(friendlyError(signInError));
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-800 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">FT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">FT Operations Portal</h1>
          <p className="text-brand-300 text-sm mt-1">Operations Control Tower</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>
            {/* Auth mode badge */}
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
                <ShieldCheck size={11} />
                Supabase Auth
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                <Lock size={11} />
                Dev Mode
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">Enter your credentials to access the portal.</p>

          {/* Dev mode notice */}
          {!isSupabaseConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <span className="font-semibold">Development Mode</span> — No real authentication.
                Any email and password will sign you in as Admin.{' '}
                Set <code className="bg-amber-100 px-1 rounded font-mono">VITE_SUPABASE_URL</code> and{' '}
                <code className="bg-amber-100 px-1 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> in{' '}
                <code className="bg-amber-100 px-1 rounded font-mono">.env</code> to enable real auth.
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={submitting}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow disabled:opacity-60 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow disabled:opacity-60 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full justify-center"
              size="md"
              loading={submitting}
              disabled={submitting}
              icon={!submitting ? <LogIn size={16} /> : undefined}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-brand-400 mt-6">
          FT Operations Portal v0.1 · Phase 1
        </p>
      </div>
    </div>
  );
}
