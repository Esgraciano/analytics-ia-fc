/*
# Multi-provider data aggregator schema

## Purpose
Supports the multi-source data aggregator architecture for Analytics IA FC.
Stores metadata about external data providers, tracked leagues, cached match
fixtures, bookmaker odds, and generated AI predictions. This allows the edge
function to cache API responses in the database to reduce external API calls
and persist predictions across requests.

## New Tables

### data_sources
- `id` (serial, primary key)
- `name` (text, unique) — e.g. "api-football", "the-odds-api", "footystats"
- `display_name` (text) — human-readable label
- `last_sync_at` (timestamptz) — last successful data pull
- `is_active` (boolean, default true) — whether this source is queried

### leagues
- `id` (serial, primary key)
- `external_id` (integer, unique) — API-Football league ID
- `name` (text, not null) — display name
- `country` (text) — country/region
- `logo` (text, nullable) — logo URL
- `is_active` (boolean, default true) — whether this league is tracked
- `season` (integer, default 2025) — current season year

### matches
- `id` (uuid, primary key, default gen_random_uuid())
- `external_id` (integer) — API-Football fixture ID
- `league_id` (integer, references leagues.external_id)
- `home_team` (text, not null)
- `away_team` (text, not null)
- `home_team_id` (integer) — API-Football team ID
- `away_team_id` (integer)
- `match_date` (timestamptz, not null)
- `status` (text, default 'NS') — fixture status short code
- `home_xg` (double precision) — model expected goals home
- `away_xg` (double precision) — model expected goals away
- `home_attack` (double precision) — attack strength
- `home_defense` (double precision) — defense strength
- `away_attack` (double precision)
- `away_defense` (double precision)
- `avg_corners` (double precision) — expected total corners
- `avg_cards` (double precision) — expected total cards
- `created_at` (timestamptz, default now())

### match_odds
- `id` (uuid, primary key, default gen_random_uuid())
- `match_id` (uuid, references matches(id) ON DELETE CASCADE)
- `bookmaker` (text) — bookmaker name from Odds API
- `market_key` (text) — market identifier (e.g. "over_under_15", "h2h")
- `outcome` (text) — specific outcome label
- `price` (double precision) — decimal odds
- `updated_at` (timestamptz, default now())

### predictions
- `id` (uuid, primary key, default gen_random_uuid())
- `match_id` (uuid, references matches(id) ON DELETE CASCADE)
- `league_id` (integer) — references leagues.external_id
- `category` (text, not null) — ticket category: seguro, tripla, cantos, cartoes, valor_extremo
- `market` (text) — selected market description
- `odd` (double precision) — individual selection odd
- `probability` (double precision) — model probability 0-1
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all new tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is shared analytics data (not user-owned). The existing `profiles`
  table retains its owner-scoped policies.

## Notes
1. The `matches` table uses `external_id` from API-Football but stores its own UUID PK.
2. `match_odds` allows multiple bookmaker odds per match for comparison.
3. `predictions` stores individual selections that the edge function groups into tickets.
4. All tables are safe to re-run (IF NOT EXISTS, DROP POLICY IF EXISTS).
*/
