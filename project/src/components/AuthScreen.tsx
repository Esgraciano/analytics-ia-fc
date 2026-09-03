import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import {
  isValidCpf,
  formatCpf,
  formatPhone,
  isValidPhone,
  isValidEmail,
  sanitizeCpf,
  sanitizePhone,
} from '@/lib/validation';
import { TrendingUp, ShieldCheck, Lock, Mail, User, Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // signup fields
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [celular, setCelular] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  // forgot fields
  const [forgotMethod, setForgotMethod] = useState<'email' | 'sms'>('email');

  function resetErrors() {
    setError(null);
    setSuccess(null);
    setCpfError(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    resetErrors();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    resetErrors();
    if (!isValidEmail(email)) {
      setError('E-mail inválido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!fullName.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (!isValidCpf(cpf)) {
      setCpfError('CPF inválido. Verifique os 11 dígitos.');
      return;
    }
    if (!isValidPhone(celular)) {
      setError('Celular inválido. Formato: (DD) 9XXXX-XXXX.');
      return;
    }
    if (!accepted) {
      setError('Você precisa aceitar o aviso legal para continuar.');
      return;
    }
    setSubmitting(true);
    const { error } = await signUp({
      email,
      password,
      fullName,
      cpf: sanitizeCpf(cpf),
      celular: formatPhone(celular),
      acceptedDisclaimer: accepted,
    });
    setSubmitting(false);
    if (error) setError(error);
  }

  function handleForgot(e: FormEvent) {
    e.preventDefault();
    resetErrors();
    if (!isValidEmail(email) && forgotMethod === 'email') {
      setError('Informe um e-mail válido para recuperação.');
      return;
    }
    if (forgotMethod === 'sms' && !isValidPhone(celular)) {
      setError('Informe um celular válido para recuperação por SMS.');
      return;
    }
    setSuccess(
      forgotMethod === 'email'
        ? 'Enviamos um link de recuperação para seu e-mail (simulação).'
        : 'Enviamos um código de recuperação por SMS (simulação).'
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-emerald-50">
      {/* Brand header */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30 mb-3 animate-scale-in">
          <TrendingUp className="w-7 h-7 text-emerald-400" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-50">Analytics IA FC</h1>
        <p className="text-sm text-emerald-200/60 mt-1">
          Bilhetes prontos gerados por IA com alta probabilidade matemática
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 px-5 pb-10">
        <div className="max-w-md mx-auto w-full">
          <div className="glass rounded-3xl border border-ink-600/60 shadow-2xl shadow-black/40 p-6 animate-slide-up">
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Header title="Entrar" subtitle="Acesse sua conta para ver os bilhetes da IA" />
                <Field icon={<Mail className="w-4 h-4" />} label="E-mail">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={inputCls}
                  />
                </Field>
                <Field icon={<Lock className="w-4 h-4" />} label="Senha">
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputCls + ' pr-11'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/40 hover:text-emerald-300"
                      aria-label="Mostrar senha"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <ErrorBanner error={error} />
                <SubmitButton loading={submitting}>Entrar</SubmitButton>
                <div className="flex items-center justify-between text-xs text-emerald-200/50">
                  <button type="button" onClick={() => { resetErrors(); setMode('forgot'); }} className="hover:text-emerald-300 underline underline-offset-2">
                    Esqueceu sua senha?
                  </button>
                  <button type="button" onClick={() => { resetErrors(); setMode('signup'); }} className="text-emerald-400 hover:text-emerald-300 font-medium">
                    Criar conta
                  </button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <Header title="Criar conta" subtitle="Cadastro obrigatório para acessar os bilhetes" />
                <Field icon={<User className="w-4 h-4" />} label="Nome completo">
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className={inputCls}
                  />
                </Field>
                <Field icon={<Mail className="w-4 h-4" />} label="E-mail">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={inputCls}
                  />
                </Field>
                <Field icon={<ShieldCheck className="w-4 h-4" />} label="CPF">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className={inputCls}
                  />
                  {cpfError && <p className="text-xs text-red-400 mt-1">{cpfError}</p>}
                </Field>
                <Field icon={<Phone className="w-4 h-4" />} label="Celular">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={celular}
                    onChange={(e) => setCelular(formatPhone(e.target.value))}
                    placeholder="(11) 91234-5678"
                    className={inputCls}
                  />
                </Field>
                <Field icon={<Lock className="w-4 h-4" />} label="Senha">
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputCls + ' pr-11'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/40 hover:text-emerald-300"
                      aria-label="Mostrar senha"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <label className="flex items-start gap-3 text-xs text-emerald-200/70 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-ink-500 bg-ink-700 text-emerald-500 focus:ring-emerald-500/40 focus:ring-offset-0"
                  />
                  <span className="leading-relaxed">
                    Compreendo que esta ferramenta fornece <strong className="text-emerald-200">estatísticas e análises</strong> geradas por IA
                    e que <strong className="text-emerald-200">não há garantia de lucro</strong>. As apostas envolvem risco.
                  </span>
                </label>
                <ErrorBanner error={error} />
                <SubmitButton loading={submitting}>Criar conta</SubmitButton>
                <div className="text-center text-xs text-emerald-200/50">
                  Já tem conta?{' '}
                  <button type="button" onClick={() => { resetErrors(); setMode('login'); }} className="text-emerald-400 hover:text-emerald-300 font-medium">
                    Entrar
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <Header title="Recuperar senha" subtitle="Escolha como receber seu acesso (simulação)" />
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton active={forgotMethod === 'email'} onClick={() => setForgotMethod('email')} icon={<Mail className="w-4 h-4" />}>
                    Por E-mail
                  </ChoiceButton>
                  <ChoiceButton active={forgotMethod === 'sms'} onClick={() => setForgotMethod('sms')} icon={<Phone className="w-4 h-4" />}>
                    Por SMS
                  </ChoiceButton>
                </div>
                {forgotMethod === 'email' ? (
                  <Field icon={<Mail className="w-4 h-4" />} label="E-mail">
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputCls}
                    />
                  </Field>
                ) : (
                  <Field icon={<Phone className="w-4 h-4" />} label="Celular">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={celular}
                      onChange={(e) => setCelular(formatPhone(e.target.value))}
                      placeholder="(11) 91234-5678"
                      className={inputCls}
                    />
                  </Field>
                )}
                <ErrorBanner error={error} />
                {success && (
                  <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                    {success}
                  </div>
                )}
                <SubmitButton loading={submitting}>Enviar recuperação</SubmitButton>
                <button
                  type="button"
                  onClick={() => { resetErrors(); setMode('login'); }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-200/50 hover:text-emerald-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-emerald-200/30 mt-6 leading-relaxed px-4">
            +18. Jogue com responsabilidade. Este app é uma ferramenta analítica e não uma casa de apostas.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-ink-800 border border-ink-600 rounded-xl px-3.5 py-3 text-sm text-emerald-50 placeholder:text-emerald-200/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition';

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-lg font-bold text-emerald-50">{title}</h2>
      <p className="text-xs text-emerald-200/50 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-200/70 mb-1.5">
        <span className="text-emerald-400/70">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 animate-fade-in">
      {error}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-ink-950 font-bold text-sm rounded-xl py-3 transition active:scale-[0.98] animate-pulse-glow"
    >
      {loading ? 'Aguarde...' : children}
    </button>
  );
}

function ChoiceButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium border transition ${
        active
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          : 'bg-ink-800 border-ink-600 text-emerald-200/50 hover:text-emerald-200'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
