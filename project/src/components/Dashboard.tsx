import { useEffect, useState } from 'react';
import { fetchLeagueMatches, generateMatchTickets } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import type { LeagueGroup, MatchInfo } from '@/lib/types';
import BetSlipCard from '@/components/BetSlipCard';
import PaywallModal from '@/components/PaywallModal';
import {
  TrendingUp,
  LogOut,
  Crown,
  Sparkles,
  Activity,
  RefreshCw,
  Database,
  ChevronDown,
  Trophy,
  Globe,
  MapPin,
  Clock,
  BarChart3,
} from 'lucide-react';

export default function Dashboard() {
  const { profile, signOut, unlockSlip } = useAuth();
  const [leagues, setLeagues] = useState<LeagueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<number>>(new Set());
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [unlockedMatches, setUnlockedMatches] = useState<Set<string>>(new Set());

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    setLoading(true);
    const data = await fetchLeagueMatches();
    setLeagues(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  const isPremium = profile?.is_premium ?? false;
  const unlockedCount = profile?.unlocked_slips_count ?? 0;
  const freeRemaining = isPremium ? Infinity : Math.max(0, 4 - unlockedCount);
  const totalMatches = leagues.reduce((sum, l) => sum + l.matches.length, 0);

  function toggleLeague(id: number) {
    setCollapsedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleViewTickets(match: MatchInfo) {
    if (isPremium || unlockedMatches.has(match.id)) {
      setExpandedMatch(expandedMatch === match.id ? null : match.id);
      return;
    }
    if (freeRemaining <= 0) {
      setPaywallOpen(true);
      return;
    }
    const res = await unlockSlip();
    if (!res) return;
    if (res.blocked) {
      setPaywallOpen(true);
      return;
    }
    setUnlockedMatches((prev) => new Set(prev).add(match.id));
    setExpandedMatch(match.id);
  }

  function formatDateTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-emerald-50 pb-24">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 glass border-b border-ink-600/60">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-emerald-50 leading-tight">Analytics IA FC</h1>
              <p className="text-[10px] text-emerald-200/40 leading-tight">Bilhetes Prontos da IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Crown className="w-3 h-3" /> Premium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-ink-700 text-emerald-200/70 border border-ink-600">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {freeRemaining === Infinity ? '∞' : freeRemaining} grátis
              </span>
            )}
            <button
              onClick={signOut}
              className="w-8 h-8 rounded-lg bg-ink-800 hover:bg-ink-700 flex items-center justify-center text-emerald-200/50 hover:text-emerald-300 transition"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Hero stat strip */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-ink-850 border border-emerald-500/20 p-4 mb-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-200/70">Multi-API Data Aggregator</span>
          </div>
          <h2 className="text-base font-bold text-emerald-50 leading-snug">
            9 ligas · {totalMatches} partidas ativas
          </h2>
          <p className="text-xs text-emerald-200/50 mt-1">
            API-Football + The Odds API + FootyStats · Poisson cross-referencing · próximos 7 dias
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Database className="w-3 h-3" /> 3 fontes ativas
            </span>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* Free trial banner */}
        {!isPremium && (
          <div className="rounded-xl bg-ink-850 border border-ink-600/60 px-4 py-3 mb-5 flex items-center justify-between gap-3 animate-fade-in">
            <div>
              <p className="text-xs font-medium text-emerald-100">Teste grátis</p>
              <p className="text-[11px] text-emerald-200/40">
                {freeRemaining > 0
                  ? `Você pode destravar mais ${freeRemaining} partida(s)`
                  : 'Você usou todos os 4 acessos grátis'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < unlockedCount ? 'bg-emerald-500' : 'bg-ink-600'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-ink-600/60 bg-ink-850 p-4 shimmer h-32" />
            ))}
          </div>
        )}

        {/* League -> Match list -> Tickets */}
        {!loading && (
          <div className="space-y-6">
            {leagues.map((lg) => {
              const isCollapsed = collapsedLeagues.has(lg.leagueId);
              return (
                <section key={lg.leagueId}>
                  {/* League header */}
                  <button
                    onClick={() => toggleLeague(lg.leagueId)}
                    className="w-full flex items-center gap-2.5 mb-3 group"
                  >
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-ink-800 border border-ink-600 text-emerald-400 group-hover:border-emerald-500/40 transition">
                      <Trophy className="w-4.5 h-4.5" />
                    </span>
                    <div className="text-left flex-1 min-w-0">
                      <h2 className="text-sm font-bold text-emerald-50 leading-tight truncate">{lg.leagueName}</h2>
                      <p className="text-[11px] text-emerald-200/40 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        {lg.leagueCountry} · {lg.matches.length} partida(s)
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-emerald-200/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>

                  {/* Match list */}
                  {!isCollapsed && (
                    <div className="space-y-3">
                      {lg.matches.map((m, mi) => {
                        const isExpanded = expandedMatch === m.id;
                        const isUnlocked = isPremium || unlockedMatches.has(m.id);
                        const tickets = isExpanded ? generateMatchTickets(m) : [];

                        return (
                          <div key={m.id}>
                            {/* Match card */}
                            <div
                              className={`rounded-2xl border bg-ink-850 overflow-hidden transition-all animate-slide-up ${
                                isExpanded ? 'border-emerald-500/40' : 'border-ink-600/60'
                              }`}
                              style={{ animationDelay: `${mi * 40}ms` }}
                            >
                              <div className="p-4">
                                {/* Teams */}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 text-center">
                                    <p className="text-sm font-bold text-emerald-50">{m.homeTeam}</p>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-200/30 px-2 py-0.5 rounded-full bg-ink-700">VS</span>
                                  <div className="flex-1 text-center">
                                    <p className="text-sm font-bold text-emerald-50">{m.awayTeam}</p>
                                  </div>
                                </div>

                                {/* Meta info */}
                                <div className="mt-3 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-200/50">
                                    <MapPin className="w-3 h-3 text-emerald-400/60" />
                                    <span className="truncate">{m.stadium}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-200/50">
                                    <Clock className="w-3 h-3 text-emerald-400/60" />
                                    <span>{formatDateTime(m.dateTime)} (SP)</span>
                                  </div>
                                </div>

                                {/* View tickets button */}
                                <button
                                  onClick={() => handleViewTickets(m)}
                                  className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                                    isUnlocked
                                      ? 'bg-ink-700 hover:bg-ink-600 text-emerald-100'
                                      : 'bg-emerald-500 hover:bg-emerald-400 text-ink-950 animate-pulse-glow'
                                  }`}
                                >
                                  <BarChart3 className="w-4 h-4" />
                                  {isUnlocked
                                    ? isExpanded
                                      ? 'Ocultar Bilhetes'
                                      : '📊 Ver Bilhetes da IA'
                                    : '📊 Ver Bilhetes da IA'}
                                </button>
                              </div>

                              {/* Expanded tickets */}
                              {isExpanded && isUnlocked && (
                                <div className="px-4 pb-4 space-y-3 border-t border-ink-600/40 pt-3">
                                  {tickets.length > 0 ? (
                                    tickets.map((t, ti) => (
                                      <BetSlipCard
                                        key={t.id}
                                        ticket={t}
                                        index={ti}
                                        unlocked={true}
                                        onUnlock={() => {}}
                                      />
                                    ))
                                  ) : (
                                    <p className="text-center text-xs text-emerald-200/40 py-4">
                                      Nenhum bilhete disponível para esta partida.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {leagues.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-emerald-200/40">Nenhuma partida disponível no momento.</p>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-emerald-200/30 mt-8 leading-relaxed px-2">
          +18. Jogue com responsabilidade. A IA fornece estatísticas e probabilidades — não há garantia de lucro.
          Este app não é uma casa de apostas.
        </p>
      </main>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
