import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Crown, X, Check, Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PaywallModal({ open, onClose }: Props) {
  const { setPremium } = useAuth();
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  async function handleSubscribe() {
    setProcessing(true);
    // Simulated checkout — in production this would redirect to Stripe.
    await new Promise((r) => setTimeout(r, 900));
    await setPremium(true);
    setProcessing(false);
    onClose();
  }

  const perks = [
    'Bilhetes gerados por IA ilimitados',
    'Múltiplas de alta taxa de acerto',
    'Acesso a todos os mercados (cantos, cartões, value bets)',
    'Análise em tempo real de 4 competições',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl bg-ink-850 border border-ink-600 shadow-2xl shadow-black/60 p-6 animate-slide-up max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-ink-700 hover:bg-ink-600 flex items-center justify-center text-emerald-200/60"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30 mb-3 animate-scale-in">
            <Crown className="w-8 h-8 text-amber-400" strokeWidth={2} />
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            <Sparkles className="w-3 h-3" /> Plano Premium
          </span>
          <h2 className="text-xl font-bold text-emerald-50 text-balance">
            Destrave bilhetes gerados por IA ilimitados
          </h2>
          <p className="text-sm text-emerald-200/60 mt-2 text-balance">
            Acesse as múltiplas de alta taxa de acerto. Assine o Plano Premium por apenas{' '}
            <strong className="text-emerald-300">R$ 19,90/mês</strong>.
          </p>
        </div>

        <ul className="mt-5 space-y-2.5">
          {perks.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-emerald-100">
              <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl bg-ink-800 border border-ink-600 p-4 flex items-baseline justify-center gap-1">
          <span className="text-sm text-emerald-200/50">R$</span>
          <span className="font-mono text-3xl font-bold text-emerald-300">19,90</span>
          <span className="text-sm text-emerald-200/50">/mês</span>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={processing}
          className="mt-4 w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-ink-950 font-bold text-sm rounded-xl py-3.5 transition active:scale-[0.98] animate-pulse-glow"
        >
          {processing ? 'Processando pagamento...' : 'Assinar agora'}
        </button>

        <p className="text-center text-[11px] text-emerald-200/30 mt-3 leading-relaxed">
          Cancele quando quiser. Pagamento simulado para demonstração.
        </p>
      </div>
    </div>
  );
}
