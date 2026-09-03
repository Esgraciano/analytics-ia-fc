/*
# Fix duplicate league ID and seed correct leagues

## Purpose
The previous migration seeded Copa Sudamericana and La Liga both with external_id 140.
This migration corrects Copa Sudamericana to its proper API-Football ID (130) and
ensures all 9 leagues have unique external_ids.

## Changes
- Removes the duplicate La Liga entry that was inserted with external_id 140
- Re-inserts La Liga with the correct external_id 140
- Inserts Copa Sudamericana with external_id 130
*/

DELETE FROM leagues WHERE external_id = 140 AND name = 'Copa Sudamericana';
DELETE FROM leagues WHERE external_id = 140 AND name = 'La Liga';

INSERT INTO leagues (external_id, name, country, is_active, season) VALUES
  (130, 'Copa Sudamericana', 'South America', true, 2025),
  (140, 'La Liga', 'Spain', true, 2025)
ON CONFLICT (external_id) DO NOTHING;
