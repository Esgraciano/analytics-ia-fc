import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const ADMIN_EMAIL = 'elton.graciano@icloud.com';

function isAdmin(email: string | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    cpf: string;
    celular: string;
    acceptedDisclaimer: boolean;
  }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  unlockSlip: () => Promise<{ blocked: boolean; remaining: number } | null>;
  setPremium: (value: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string, email?: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) return;
    if (data) {
      const p = data as Profile;
      if (isAdmin(email)) {
        setProfile({ ...p, is_premium: true, unlocked_slips_count: 0 });
      } else {
        setProfile(p);
      }
    }
  }

  useEffect(() => {
    let mounted = true;
    // Safety timeout: never stay in loading state longer than 3s (prevents auth-loop blank screen)
    const safety = setTimeout(() => mounted && setLoading(false), 3000);
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id, data.session.user.email).finally(() => {
          if (!mounted) return;
          clearTimeout(safety);
          setLoading(false);
        });
      } else {
        clearTimeout(safety);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        if (sess) {
          await loadProfile(sess.user.id, sess.user.email);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue['signUp'] = async (params) => {
    // Pre-check CPF uniqueness client-side for a friendlier error
    const cleanCpf = params.cpf.replace(/\D/g, '');
    const { data: existingCpf } = await supabase
      .from('profiles')
      .select('id')
      .eq('cpf', cleanCpf)
      .maybeSingle();
    if (existingCpf) return { error: 'CPF já cadastrado' };

    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
        return { error: 'E-mail já cadastrado' };
      }
      return { error: error.message };
    }
    if (!data.user) return { error: 'Não foi possível criar a conta.' };

    // Upsert profile fields (trigger already created a placeholder row)
    const { error: upsertError } = await supabase
      .from('profiles')
      .update({
        full_name: params.fullName.trim(),
        cpf: cleanCpf,
        celular: params.celular,
        accepted_disclaimer: params.acceptedDisclaimer,
      })
      .eq('id', data.user.id);

    if (upsertError) {
      if (upsertError.code === '23505') {
        // unique violation
        if (upsertError.message.toLowerCase().includes('cpf')) return { error: 'CPF já cadastrado' };
        return { error: 'E-mail já cadastrado' };
      }
      return { error: upsertError.message };
    }

    await loadProfile(data.user.id, data.user.email);
    return { error: null };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: 'E-mail ou senha incorretos.' };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };

  const unlockSlip: AuthContextValue['unlockSlip'] = async () => {
    if (!profile) return null;
    if (isAdmin(session?.user?.email)) return { blocked: false, remaining: Infinity };
    if (profile.is_premium) return { blocked: false, remaining: Infinity };
    if (profile.unlocked_slips_count >= 4) return { blocked: true, remaining: 0 };
    const newCount = profile.unlocked_slips_count + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ unlocked_slips_count: newCount })
      .eq('id', profile.id);
    if (error) return null;
    setProfile({ ...profile, unlocked_slips_count: newCount });
    return { blocked: false, remaining: 4 - newCount };
  };

  const setPremium: AuthContextValue['setPremium'] = async (value) => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: value })
      .eq('id', profile.id);
    if (!error) setProfile({ ...profile, is_premium: value });
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signUp, signIn, signOut, refreshProfile, unlockSlip, setPremium }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
