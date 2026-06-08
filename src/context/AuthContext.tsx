import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  department: string | null;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  session: Session | null;
  loading: boolean;
  isDevMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// ─── Dev-mode mock user (used when Supabase is not configured) ────────────────

const DEV_PROFILE: UserProfile = {
  id: 'dev-usr-001',
  full_name: 'Dev Admin',
  email: 'admin@ft-ops.local',
  avatar_url: null,
  department: 'Operations',
  is_active: true,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // If Supabase is not configured, boot into dev mode immediately.
  // In production builds (import.meta.env.PROD), skip the dev admin injection so
  // AppLayout can render a clear "Supabase not configured" error instead of showing
  // a mock admin session with fake data.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (import.meta.env.PROD) {
        // Production build without Supabase env vars — surface a config error, not mock data.
        setLoading(false);
        return;
      }
      setProfile(DEV_PROFILE);
      setRole('admin');
      setLoading(false);
      return;
    }

    // Initial session
    supabase!.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email,
          avatar_url: profileData.avatar_url,
          department: profileData.department,
          is_active: profileData.is_active,
        });
      }

      // Fetch role
      const { data: roleData } = await supabase!
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleData) {
        setRole(roleData.role as UserRole);
      }
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) {
      if (import.meta.env.PROD) {
        return { error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables.' };
      }
      // Dev mode: accept any credentials
      setProfile({ ...DEV_PROFILE, email });
      setRole('admin');
      return { error: null };
    }

    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      setProfile(null);
      setRole(null);
      return;
    }
    await supabase!.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        session,
        loading,
        isDevMode: !isSupabaseConfigured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
