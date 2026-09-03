import { useState } from 'react';
import type { BetTicket, TicketCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';

export const CATEGORY_META: Record<
  TicketCategory,
  { icon: React.ReactNode; badge: string; accent: string; ring: string; glow: string }
> = {
  seguro: {
    icon: <ShieldCheck className="w-4 h-4" />,
    badge: 'Seguro',
    accent: 'text-emerald-400',
    ring: 'border-emerald-500/30',
    glow: 'from-emerald-500/10',
  },
  cantos_cartoes: {
    icon: <Target className="w-4 h-4" />,
    badge: 'Cantos/Cartões',
    accent: 'text-sky-400',
    ring: 'border-sky-500/30',
    glow: 'from-sky-500/10',
  },
  valor_premium: {
    icon: <Zap className="w-4 h-4" />,
    badge: 'Valor/Premium',
    accent: 'text-amber-400',
    ring: 'border-amber-500/30',
    glow: 'from-amber-500/10',
  },
};

interface Props {
  ticket: BetTicket;
  index: number;
  unlocked: boolean;
  onUnlock: () => void;
}

export default function BetSlipCard({ ticket, index, unlocked, onUnlock }: Props) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[ticket.category];

  const isUnlocked = unlocked;

  function handleClick() {
    if (isUnlocked) {
      setExpanded((v) => !v);
    } else {
      onUnlock();
    }
  }

  const confidenceColor =
    ticket.confidence >= 85 ? 'bg-emerald-500' : ticket.confidence >= 78 ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div
      className={`relative rounded-2xl border ${meta.ring} bg-ink-850 overflow-hidden animate-slide-up`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${meta.glow} to-transparent pointer-events-none`} />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-ink-700 ${meta.accent}`}>
              {meta.icon}
              {meta.badge}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-emerald-200/40">Odd total</div>
            <div className="font-mono text-lg font-bold text-emerald-300 leading-none">
              {ticket.combinedOdd.toFixed(2)}
            </div>
          </div>
        </div>

        <h3 className="mt-2.5 text-sm font-bold text-emerald-50 leading-snug">{ticket.title}</h3>
        <p className="mt-1 text-xs text-emerald-200/50 leading-relaxed line-clamp-2">{ticket.description}</p>

        {/* confidence bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-emerald-200/60">Confiança da IA</span>
            <span className="font-mono font-bold text-emerald-300">{ticket.confidence}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
            <div
              className={`h-full ${confidenceColor} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${ticket.confidence}%` }}
            />
          </div>
        </div>

        {/* picks */}
        <div className="mt-3 space-y-2">
          {isUnlocked ? (
            ticket.picks.map((pick, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-xl bg-ink-800 border border-ink-600/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-emerald-200/40 truncate">{pick.match}</div>
                  <div className="text-xs text-emerald-100 font-medium truncate">{pick.market}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-emerald-300">{pick.odd.toFixed(2)}</div>
                  <div className="text-[9px] text-emerald-200/30">{Math.round(pick.probability * 100)}%</div>
                </div>
              </div>
            ))
          ) : (
            <>
              {ticket.picks.slice(0, 2).map((pick, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-ink-800 border border-ink-600/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[10px] text-emerald-200/40 truncate">{i === 0 ? 'Partida' : 'Mercado'}</div>
                    <div className="text-xs text-emerald-100 font-medium truncate blur-sm select-none">
                      {i === 0 ? pick.match : pick.market}
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-emerald-400/60 shrink-0" />
                </div>
              ))}
              <div className="text-center text-[10px] text-emerald-200/30 pt-0.5">
                +{ticket.picks.length - 2} seleção(ões) bloqueada(s)
              </div>
            </>
          )}
        </div>

        {/* action */}
        <button
          onClick={handleClick}
          className={`mt-3.5 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
            isUnlocked
              ? 'bg-ink-700 hover:bg-ink-600 text-emerald-100'
              : 'bg-emerald-500 hover:bg-emerald-400 text-ink-950 animate-pulse-glow'
          }`}
        >
          {isUnlocked ? (
            <>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Recolher' : 'Ver seleções'}
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              Destravar bilhete
            </>
          )}
        </button>
      </div>
    </div>
  );
}
