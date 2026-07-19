import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { DevModeBanner } from '../components/ui/DevModeBanner';
import { LandingAchievements } from '../components/features/MyAchievements';
import { isSupabaseConfigured } from '../lib/supabase';
import { ShieldAlert } from 'lucide-react';

function ProductionConfigError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={26} className="text-red-500" />
        </div>
        <h1 className="text-base font-bold text-gray-900 mb-2">Supabase Not Configured</h1>
        <p className="text-sm text-gray-600 mb-5">
          This deployment is missing required environment variables. Add the following to your Vercel
          project settings under <strong>Settings → Environment Variables</strong>:
        </p>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-left font-mono text-xs text-gray-700 space-y-1.5 mb-5">
          <div>VITE_SUPABASE_URL</div>
          <div>VITE_SUPABASE_ANON_KEY</div>
        </div>
        <p className="text-xs text-gray-400">
          After setting the variables, redeploy the project for the changes to take effect.
        </p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // In production builds, require Supabase to be configured. Showing mock dev-admin
  // data in a production deployment is a misconfiguration, not a feature.
  if (import.meta.env.PROD && !isSupabaseConfigured) {
    return <ProductionConfigError />;
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen(true)} />
          <DevModeBanner />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <LandingAchievements />
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
