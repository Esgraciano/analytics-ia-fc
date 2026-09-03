import type { AnalyticsResponse, BetTicket, LeagueGroup, MatchInfo, TicketCategory } from './types';

const FUNCTION_SLUG = 'match-analytics';

export async function fetchLeagueMatches(): Promise<LeagueGroup[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTION_SLUG}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as AnalyticsResponse;
    if (!data || !Array.isArray(data.leagues) || data.leagues.length === 0) {
      throw new Error('Nenhuma partida disponível');
    }
    return data.leagues;
  } catch {
    return localFallbackLeagues();
  }
}

// --- Generate 3 per-match tickets ---
export function generateMatchTickets(m: MatchInfo): BetTicket[] {
  const tickets: BetTicket[] = [];

  const seguro = buildSeguro(m);
  if (seguro) tickets.push(seguro);

  const cantosCartoes = buildCantosCartoes(m);
  if (cantosCartoes) tickets.push(cantosCartoes);

  const valor = buildValorPremium(m);
  if (valor) tickets.push(valor);

  return tickets;
}

// --- Poisson helpers ---
function factorial(n: number): number { if (n <= 1) return 1; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function poissonPmf(k: number, lambda: number): number { if (lambda <= 0) return k === 0 ? 1 : 0; return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k); }
function poissonOver(lambda: number, line: number): number { let o = 0; for (let k = 0; k <= 15; k++) if (k > line) o += poissonPmf(k, lambda); return Math.min(0.99, o); }
function matchProbs(hxg: number, axg: number) {
  let h = 0, d = 0, a = 0;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { const p = poissonPmf(i, hxg) * poissonPmf(j, axg); if (i > j) h += p; else if (i === j) d += p; else a += p; }
  const t = h + d + a || 1; return { home: h / t, draw: d / t, away: a / t };
}
function probOverGoals(hxg: number, axg: number, line: number): number {
  let o = 0; for (let h = 0; h <= 10; h++) for (let a = 0; a <= 10; a++) if (h + a > line) o += poissonPmf(h, hxg) * poissonPmf(a, axg); return Math.min(0.99, o);
}
function roundOdd(p: number): number { const s = Math.min(0.98, Math.max(0.35, p)); return Math.round((1 / s) * 100) / 100; }
function clampOdd(o: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.round(o * 100) / 100)); }
function round2(v: number): number { return Math.round(v * 100) / 100; }

const matchLabel = (m: MatchInfo) => `${m.homeTeam} vs ${m.awayTeam}`;

function buildSeguro(m: MatchInfo): BetTicket | null {
  const o15 = probOverGoals(m.homeXG, m.awayXG, 1.5);
  if (o15 < 0.72) return null;
  const probs = matchProbs(m.homeXG, m.awayXG);
  const fav = probs.home >= probs.away ? m.homeTeam : m.awayTeam;
  const favP = Math.max(probs.home, probs.away);
  if (favP < 0.45) return null;
  const match = matchLabel(m);
  const picks = [
    { match, league: m.leagueName, market: 'Mais de 1.5 gols na partida', marketType: 'over_goals' as const, odd: clampOdd(roundOdd(o15), 1.25, 1.55), probability: o15 },
    { match, league: m.leagueName, market: `Vitória do ${fav}`, marketType: 'moneyline' as const, odd: clampOdd(roundOdd(favP), 1.3, 1.75), probability: favP },
  ];
  const combined = round2(picks.reduce((a, p) => a * p.odd, 1));
  if (combined < 1.4 || combined > 2.0) return null;
  return {
    id: `seguro-${m.id}`, category: 'seguro', leagueId: m.leagueId,
    leagueName: m.leagueName, leagueCountry: m.leagueCountry, matchId: m.id,
    title: 'Bilhete Seguro / Dupla do Dia',
    description: 'Favoritos claros e linhas de gols seguras. Odds combinadas entre 1.50 e 1.80.',
    picks, combinedOdd: combined, confidence: Math.round(Math.min(0.96, (o15 + favP) / 2) * 100),
  };
}

function buildCantosCartoes(m: MatchInfo): BetTicket | null {
  const bc = Math.max(6.0, m.avgCorners + (m.homeXG + m.awayXG) * 0.8);
  const bd = Math.max(3.5, m.avgCards + (m.homeXG + m.awayXG) * 0.5);
  const match = matchLabel(m);
  const picks = [];

  const pCorners35H = Math.min(0.95, 0.50 + bc * 0.05);
  picks.push({ match, league: m.leagueName, market: 'Mais de 3.5 escanteios no 1º tempo', marketType: 'over_corners_1h' as const, odd: clampOdd(roundOdd(pCorners35H), 1.7, 2.6), probability: pCorners35H });
  const pCorners10 = Math.min(0.92, 0.35 + bc * 0.05);
  if (pCorners10 >= 0.60) picks.push({ match, league: m.leagueName, market: 'Mais de 9.5 escanteios na partida (até 10)', marketType: 'over_corners' as const, odd: clampOdd(roundOdd(pCorners10), 1.8, 2.8), probability: pCorners10 });
  const pCards152H = Math.min(0.95, 0.45 + bd * 0.08);
  picks.push({ match, league: m.leagueName, market: 'Mais de 1.5 cartões no 2º tempo', marketType: 'over_cards_2h' as const, odd: clampOdd(roundOdd(pCards152H), 1.8, 2.8), probability: pCards152H });
  const pCards7 = Math.min(0.92, 0.30 + bd * 0.08);
  if (pCards7 >= 0.55) picks.push({ match, league: m.leagueName, market: 'Mais de 6.5 cartões na partida (até 7)', marketType: 'over_cards' as const, odd: clampOdd(roundOdd(pCards7), 1.9, 3.0), probability: pCards7 });

  if (picks.length < 3) return null;
  const combined = round2(picks.reduce((a, p) => a * p.odd, 1));
  if (combined < 1.5 || combined > 8.0) return null;
  const avg = picks.reduce((a, p) => a + p.probability, 0) / picks.length;
  return {
    id: `cantos-cartoes-${m.id}`, category: 'cantos_cartoes', leagueId: m.leagueId,
    leagueName: m.leagueName, leagueCountry: m.leagueCountry, matchId: m.id,
    title: 'Alvo de Cantos/Cartões',
    description: 'Combo especializado usando Poisson: até 10 escanteios e 7 cartões por tempo.',
    picks, combinedOdd: combined, confidence: Math.round(Math.min(0.91, avg) * 100),
  };
}

function buildValorPremium(m: MatchInfo): BetTicket | null {
  const probs = matchProbs(m.homeXG, m.awayXG);
  const fav = probs.home >= probs.away ? m.homeTeam : m.awayTeam;
  const favP = Math.max(probs.home, probs.away);
  const o25 = probOverGoals(m.homeXG, m.awayXG, 2.5);
  const match = matchLabel(m);
  const picks = [];

  if (favP >= 0.50) {
    picks.push({ match, league: m.leagueName, market: `Vitória do ${fav} (Value Bet)`, marketType: 'moneyline' as const, odd: clampOdd(roundOdd(favP) * 1.15, 1.8, 2.8), probability: favP });
  }
  if (o25 >= 0.50) {
    picks.push({ match, league: m.leagueName, market: 'Mais de 2.5 gols (Value Bet)', marketType: 'over_goals' as const, odd: clampOdd(roundOdd(o25) * 1.15, 1.9, 3.0), probability: o25 });
  }
  const dcProb = probs.home + probs.draw;
  if (dcProb >= 0.65) {
    picks.push({ match, league: m.leagueName, market: `Dupla Chance: ${m.homeTeam} ou Empate`, marketType: 'double_chance' as const, odd: clampOdd(roundOdd(dcProb), 1.3, 1.7), probability: dcProb });
  }

  if (picks.length < 2) return null;
  const combined = round2(picks.reduce((a, p) => a * p.odd, 1));
  if (combined < 2.0) return null;
  const avg = picks.reduce((a, p) => a + p.probability, 0) / picks.length;
  return {
    id: `valor-${m.id}`, category: 'valor_premium', leagueId: m.leagueId,
    leagueName: m.leagueName, leagueCountry: m.leagueCountry, matchId: m.id,
    title: 'Alerta de Valor / Múltipla Premium',
    description: 'Combinação de alto rendimento checando odds mal precificadas. Odds 2.00+.',
    picks, combinedOdd: combined, confidence: Math.round(Math.min(0.88, avg) * 100),
  };
}

// --- Fallback data ---
function localFallbackLeagues(): LeagueGroup[] {
  const matches: MatchData[] = [
    { home: 'Palmeiras', away: 'Atlético-MG', league: 'Brasileirão Série A', leagueId: 71, country: 'Brazil', stadium: 'Allianz Parque', time: '2026-09-03T21:30:00', hxg: 2.45, axg: 0.72, corners: 8.5, cards: 4.5 },
    { home: 'Flamengo', away: 'Bragantino', league: 'Brasileirão Série A', leagueId: 71, country: 'Brazil', stadium: 'Maracanã', time: '2026-09-04T19:00:00', hxg: 2.15, axg: 0.95, corners: 8.0, cards: 4.2 },
    { home: 'Corinthians', away: 'Cruzeiro', league: 'Brasileirão Série A', leagueId: 71, country: 'Brazil', stadium: 'Neo Química Arena', time: '2026-09-05T18:30:00', hxg: 1.85, axg: 1.05, corners: 7.5, cards: 4.0 },
    { home: 'Manchester City', away: 'Brighton', league: 'Premier League', leagueId: 39, country: 'England', stadium: 'Etihad Stadium', time: '2026-09-03T16:00:00', hxg: 2.65, axg: 0.82, corners: 9.5, cards: 4.0 },
    { home: 'Arsenal', away: 'Fulham', league: 'Premier League', leagueId: 39, country: 'England', stadium: 'Emirates Stadium', time: '2026-09-04T15:00:00', hxg: 2.35, axg: 0.88, corners: 9.0, cards: 4.2 },
    { home: 'Liverpool', away: 'Brentford', league: 'Premier League', leagueId: 39, country: 'England', stadium: 'Anfield', time: '2026-09-05T13:30:00', hxg: 2.50, axg: 1.05, corners: 9.2, cards: 3.8 },
    { home: 'Real Madrid', away: 'Getafe', league: 'La Liga', leagueId: 140, country: 'Spain', stadium: 'Santiago Bernabéu', time: '2026-09-03T17:00:00', hxg: 2.55, axg: 0.65, corners: 8.0, cards: 5.0 },
    { home: 'Barcelona', away: 'Rayo Vallecano', league: 'La Liga', leagueId: 140, country: 'Spain', stadium: 'Spotify Camp Nou', time: '2026-09-04T20:00:00', hxg: 2.40, axg: 0.90, corners: 7.8, cards: 4.8 },
    { home: 'Bayern Munich', away: 'Augsburg', league: 'Bundesliga', leagueId: 78, country: 'Germany', stadium: 'Allianz Arena', time: '2026-09-03T15:30:00', hxg: 2.75, axg: 0.78, corners: 8.5, cards: 4.0 },
    { home: 'Borussia Dortmund', away: 'Bochum', league: 'Bundesliga', leagueId: 78, country: 'Germany', stadium: 'Signal Iduna Park', time: '2026-09-05T15:30:00', hxg: 2.45, axg: 0.92, corners: 8.2, cards: 4.2 },
    { home: 'PSG', away: 'Le Havre', league: 'Ligue 1', leagueId: 61, country: 'France', stadium: 'Parc des Princes', time: '2026-09-03T20:45:00', hxg: 2.70, axg: 0.70, corners: 8.5, cards: 4.0 },
    { home: 'Marseille', away: 'Nantes', league: 'Ligue 1', leagueId: 61, country: 'France', stadium: 'Stade Vélodrome', time: '2026-09-04T19:00:00', hxg: 2.10, axg: 0.95, corners: 7.8, cards: 4.5 },
    { home: 'Real Madrid', away: 'Inter Milan', league: 'Champions League', leagueId: 2, country: 'Europe', stadium: 'Santiago Bernabéu', time: '2026-09-03T16:00:00', hxg: 2.05, axg: 1.15, corners: 8.5, cards: 4.5 },
    { home: 'Bayern Munich', away: 'Barcelona', league: 'Champions League', leagueId: 2, country: 'Europe', stadium: 'Allianz Arena', time: '2026-09-04T16:00:00', hxg: 2.20, axg: 1.25, corners: 8.8, cards: 4.8 },
    { home: 'Manchester City', away: 'PSG', league: 'Champions League', leagueId: 2, country: 'Europe', stadium: 'Etihad Stadium', time: '2026-09-05T20:00:00', hxg: 2.15, axg: 1.20, corners: 9.0, cards: 4.2 },
    { home: 'Flamengo', away: 'River Plate', league: 'Copa Libertadores', leagueId: 13, country: 'South America', stadium: 'Maracanã', time: '2026-09-03T21:30:00', hxg: 2.10, axg: 1.00, corners: 8.0, cards: 4.8 },
    { home: 'Palmeiras', away: 'Boca Juniors', league: 'Copa Libertadores', leagueId: 13, country: 'South America', stadium: 'Allianz Parque', time: '2026-09-04T19:30:00', hxg: 1.95, axg: 0.90, corners: 7.8, cards: 5.0 },
    { home: 'Flamengo', away: 'Athletico-PR', league: 'Copa do Brasil', leagueId: 77, country: 'Brazil', stadium: 'Maracanã', time: '2026-09-03T21:00:00', hxg: 2.25, axg: 0.85, corners: 7.5, cards: 4.5 },
    { home: 'Grêmio', away: 'Internacional', league: 'Copa do Brasil', leagueId: 77, country: 'Brazil', stadium: 'Arena do Grêmio', time: '2026-09-05T18:30:00', hxg: 1.75, axg: 1.10, corners: 7.8, cards: 5.5 },
    { home: 'Santos', away: 'Defensa y Justicia', league: 'Copa Sudamericana', leagueId: 130, country: 'South America', stadium: 'Vila Belmiro', time: '2026-09-03T19:00:00', hxg: 2.00, axg: 0.90, corners: 7.5, cards: 4.2 },
    { home: 'Bahia', away: 'Lanús', league: 'Copa Sudamericana', leagueId: 130, country: 'South America', stadium: 'Arena Fonte Nova', time: '2026-09-04T19:30:00', hxg: 1.85, axg: 1.00, corners: 7.3, cards: 4.5 },
  ];

  const byLeague = new Map<number, MatchInfo[]>();
  for (const m of matches) {
    if (!byLeague.has(m.leagueId)) byLeague.set(m.leagueId, []);
    byLeague.get(m.leagueId)!.push(toMatchInfo(m));
  }

  const leagues: LeagueGroup[] = [];
  for (const [leagueId, leagueMatches] of byLeague) {
    leagues.push({
      leagueId,
      leagueName: leagueMatches[0].leagueName,
      leagueCountry: leagueMatches[0].leagueCountry,
      matches: leagueMatches,
    });
  }
  return leagues;
}

interface MatchData {
  home: string; away: string; league: string; leagueId: number; country: string;
  stadium: string; time: string; hxg: number; axg: number; corners: number; cards: number;
}

function toMatchInfo(m: MatchData): MatchInfo {
  const id = `${m.leagueId}-${m.home}-${m.away}`.replace(/\s+/g, '-');
  return {
    id,
    leagueId: m.leagueId,
    leagueName: m.league,
    leagueCountry: m.country,
    homeTeam: m.home,
    awayTeam: m.away,
    stadium: m.stadium,
    dateTime: m.time,
    homeXG: m.hxg,
    awayXG: m.axg,
    avgCorners: m.corners,
    avgCards: m.cards,
  };
}
