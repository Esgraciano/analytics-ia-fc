/*
# Multi-provider data aggregator schema

## Purpose
Supports the multi-source data aggregator architecture for Analytics IA FC.
Stores metadata about external data providers, tracked leagues, cached match
fixtures, bookmaker odds, and generated AI predictions. This allows the edge
function to cache API responses in the database to reduce external API calls
and persist predictions across requests.

## New Tables
- data_sources: external API provider registry (api-football, the-odds-api, footystats)
- leagues: tracked competitions with API-Football external IDs (9 leagues)
- matches: cached fixture data with model xG values and team strengths
- match_odds: bookmaker odds from The Odds API for value bet detection
- predictions: individual AI-generated selections grouped into tickets

## Security
- RLS enabled on all new tables.
- All tables use TO anon, authenticated with USING(true)/WITH CHECK(true)
  because this is shared analytics data (not user-owned). The existing profiles
  table retains its owner-scoped policies.

## Notes
1. matches.external_id is API-Football fixture ID; UUID is the PK.
2. match_odds allows multiple bookmaker odds per match for comparison.
3. predictions stores individual selections that the edge function groups into tickets.
4. All statements are idempotent (IF NOT EXISTS, DROP POLICY IF EXISTS).
*/

CREATE TABLE IF NOT EXISTS data_sources (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  last_sync_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_data_sources" ON data_sources;
CREATE POLICY "anon_select_data_sources" ON data_sources FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS leagues (
  id serial PRIMARY KEY,
  external_id integer UNIQUE NOT NULL,
  name text NOT NULL,
  country text,
  logo text,
  is_active boolean NOT NULL DEFAULT true,
  season integer NOT NULL DEFAULT 2025
);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_leagues" ON leagues;
CREATE POLICY "anon_select_leagues" ON leagues FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id integer,
  league_id integer,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_team_id integer,
  away_team_id integer,
  match_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'NS',
  home_xg double precision,
  away_xg double precision,
  home_attack double precision,
  home_defense double precision,
  away_attack double precision,
  away_defense double precision,
  avg_corners double precision,
  avg_cards double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_matches" ON matches;
CREATE POLICY "anon_select_matches" ON matches FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_matches" ON matches;
CREATE POLICY "anon_insert_matches" ON matches FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_matches" ON matches;
CREATE POLICY "anon_update_matches" ON matches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS matches_league_idx ON matches (league_id);
CREATE INDEX IF NOT EXISTS matches_date_idx ON matches (match_date);

CREATE TABLE IF NOT EXISTS match_odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  bookmaker text,
  market_key text,
  outcome text,
  price double precision,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE match_odds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_match_odds" ON match_odds;
CREATE POLICY "anon_select_match_odds" ON match_odds FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  league_id integer,
  category text NOT NULL,
  market text,
  odd double precision,
  probability double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_predictions" ON predictions;
CREATE POLICY "anon_select_predictions" ON predictions FOR SELECT
  TO anon, authenticated USING (true);

-- Seed data sources
INSERT INTO data_sources (name, display_name, is_active) VALUES
  ('api-football', 'API-Football', true),
  ('the-odds-api', 'The Odds API', true),
  ('footystats', 'FootyStats API', true)
ON CONFLICT (name) DO NOTHING;

-- Seed 9 leagues
INSERT INTO leagues (external_id, name, country, is_active, season) VALUES
  (71, 'Brasileirão Série A', 'Brazil', true, 2025),
  (77, 'Copa do Brasil', 'Brazil', true, 2025),
  (13, 'Copa Libertadores', 'South America', true, 2025),
  (140, 'Copa Sudamericana', 'South America', true, 2025),
  (2, 'Champions League', 'Europe', true, 2025),
  (39, 'Premier League', 'England', true, 2025),
  (140, 'La Liga', 'Spain', true, 2025),
  (78, 'Bundesliga', 'Germany', true, 2025),
  (61, 'Ligue 1', 'France', true, 2025)
ON CONFLICT (external_id) DO NOTHING;
