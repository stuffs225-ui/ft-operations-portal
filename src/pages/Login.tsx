import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export function Login() {
  const { profile, signIn, loading, isDevMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in
  if (!loading && profile) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) setError(signInError);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-800 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">FT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">FT Operations Portal</h1>
          <p className="text-brand-300 text-sm mt-1">Operations Control Tower</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the portal.</p>

          {/* Dev mode notice */}
          {isDevMode && (
            <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3 mb-5">
              <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-700">
                <span className="font-semibold">Dev Mode</span> — Supabase not configured.
                Any credentials will sign you in as Admin.
              </div>
            </div>
          )}

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
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
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
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
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
              icon={!submitting ? <LogIn size={16} /> : undefined}
            >
              Sign in
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
