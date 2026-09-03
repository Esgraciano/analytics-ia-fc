export type MarketType =
  | 'over_goals'
  | 'moneyline'
  | 'over_corners'
  | 'over_cards'
  | 'over_corners_1h'
  | 'over_cards_2h'
  | 'over_corners_2h'
  | 'over_cards_1h'
  | 'double_chance';

export type TicketCategory =
  | 'seguro'
  | 'cantos_cartoes'
  | 'valor_premium';

export interface BetPick {
  match: string;
  league: string;
  market: string;
  marketType: MarketType;
  odd: number;
  probability: number;
}

export interface BetTicket {
  id: string;
  category: TicketCategory;
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  matchId: string;
  title: string;
  description: string;
  picks: BetPick[];
  combinedOdd: number;
  confidence: number;
}

export interface MatchInfo {
  id: string;
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  dateTime: string;
  homeXG: number;
  awayXG: number;
  avgCorners: number;
  avgCards: number;
}

export interface LeagueGroup {
  leagueId: number;
  leagueName: string;
  leagueCountry: string;
  matches: MatchInfo[];
}

export interface AnalyticsResponse {
  leagues: LeagueGroup[];
  fallback?: boolean;
  error?: string;
  sources?: string[];
}

export interface Profile {
  id: string;
  full_name: string;
  cpf: string;
  celular: string;
  accepted_disclaimer: boolean;
  is_premium: boolean;
  unlocked_slips_count: number;
}

export const TICKET_CATEGORY_META: Record<
  TicketCategory,
  { title: string; description: string; oddsRange: string }
> = {
  seguro: {
    title: 'Bilhete Seguro / Dupla do Dia',
    description: 'Favoritos claros e linhas de gols seguras. Odds combinadas entre 1.50 e 1.80.',
    oddsRange: '1.50 – 1.80',
  },
  cantos_cartoes: {
    title: 'Alvo de Cantos/Cartões',
    description: 'Combo especializado usando Poisson: até 10 escanteios e 7 cartões por tempo.',
    oddsRange: '2.00 – 5.00',
  },
  valor_premium: {
    title: 'Alerta de Valor / Múltipla Premium',
    description: 'Combinação de alto rendimento checando odds mal precificadas. Odds 2.00+.',
    oddsRange: '2.00+',
  },
};

export const CATEGORY_ORDER: TicketCategory[] = [
  'seguro',
  'cantos_cartoes',
  'valor_premium',
];
