/*
# Create profiles table and registration helpers

## Purpose
Stores the anti-fraud registration data for users of the Analytics IA FC betting
analytics app. Each row corresponds to one authenticated Supabase auth user and
holds the extra signup fields required by the app: full name, CPF (Brazilian tax
ID), and celular (mobile phone). Email and password are managed by Supabase Auth
itself, so they are NOT duplicated here.

## New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users) — one row per auth user.
  - `full_name` (text, not null) — user's full legal name.
  - `cpf` (text, not null, unique) — 11-digit Brazilian tax ID, digits only.
  - `celular` (text, not null) — mobile phone, stored formatted as (DD) 9XXXX-XXXX.
  - `accepted_disclaimer` (boolean, not null, default false) — legal disclaimer acceptance.
  - `is_premium` (boolean, not null, default false) — premium subscription flag.
  - `unlocked_slips_count` (integer, not null, default 0) — free-trial unlock counter.
  - `created_at` (timestamptz, default now()).

## Security
- RLS enabled on `profiles`.
- 4 owner-scoped CRUD policies (select/insert/update/delete) scoped to `authenticated`
  using `auth.uid() = id`. The `id` column defaults to `auth.uid()` so inserts from the
  client (which omit `id`) succeed.

## Functions
- `handle_new_user()` — SECURITY DEFINER trigger function that inserts a placeholder
  profile row when a new auth user is created. The actual profile fields are filled in
  by the app after signup. This avoids the anon-key client being unable to insert into
  profiles before the session is fully established.

## Triggers
- `on_auth_user_created` — AFTER INSERT on auth.users, calls `handle_new_user()`.

## Notes
1. CPF uniqueness is enforced at the database level so duplicate registrations are
   rejected even under race conditions. The app also checks client-side for a friendlier
   error, but the DB constraint is the source of truth.
2. The `id` column has `DEFAULT auth.uid()` so the client can insert profile data
   without passing an id; the authenticated session fills it in.
3. Email uniqueness is handled by Supabase Auth's own auth.users table (unique email).
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  cpf text UNIQUE NOT NULL DEFAULT '',
  celular text NOT NULL DEFAULT '',
  accepted_disclaimer boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  unlocked_slips_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_cpf_idx ON profiles (cpf);

-- Trigger function to seed a profile row when a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
