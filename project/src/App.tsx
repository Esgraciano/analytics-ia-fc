import { AuthProvider, useAuth } from '@/lib/auth';
import AuthScreen from '@/components/AuthScreen';
import Dashboard from '@/components/Dashboard';
import { TrendingUp } from 'lucide-react';

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center animate-pulse">
          <TrendingUp className="w-7 h-7 text-emerald-400" strokeWidth={2.5} />
        </div>
        <p className="text-sm text-emerald-200/50">Carregando Analytics IA FC...</p>
      </div>
    );
  }

  return session ? <Dashboard /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
