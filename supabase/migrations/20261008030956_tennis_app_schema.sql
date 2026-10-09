/*
# Tennis Record Ranking App — Database Schema

## Overview
Complete database structure for the Tennis Record Ranking App (1-Set | Hard-Court only).
Supports player profiles, club creation, membership with roles (Admin/Mod/Member),
pending join requests, and 1-set match records.

## Tables
1. players — player profiles linked to auth users
2. clubs — club entities created by users
3. club_members — membership records with roles and status
4. matches — 1-set match records within clubs

## Security
- RLS enabled on all tables
- Owner-scoped policies using auth.uid()
- Club members can view club data
- Admins manage memberships
- Mods/Admins record matches
*/

-- ============ TABLES (created first to avoid FK ordering issues) ============

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  nickname text NOT NULL DEFAULT '',
  dob date,
  handedness text DEFAULT 'Right',
  racket_model text DEFAULT '',
  shoe_size text DEFAULT '',
  avatar_url text DEFAULT '',
  email text UNIQUE,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  foundation_date date,
  bio text DEFAULT '',
  schedule text DEFAULT '',
  cover_url text DEFAULT '',
  logo_url text DEFAULT '',
  gps_lat numeric DEFAULT 0,
  gps_lng numeric DEFAULT 0,
  creator_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  player_name text DEFAULT '',
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player1_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player2_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player1_name text DEFAULT '',
  player2_name text DEFAULT '',
  player1_games int NOT NULL DEFAULT 0,
  player2_games int NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES players(id) ON DELETE SET NULL,
  winner_name text DEFAULT '',
  court_type text NOT NULL DEFAULT 'hard',
  set_format text NOT NULL DEFAULT '1-set',
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ RLS ENABLE ============

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: players ============

DROP POLICY IF EXISTS "select_own_player" ON players;
CREATE POLICY "select_own_player" ON players FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_player" ON players;
CREATE POLICY "insert_own_player" ON players FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_player" ON players;
CREATE POLICY "update_own_player" ON players FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can read basic player info for match selection
DROP POLICY IF EXISTS "select_all_players_basic" ON players;
CREATE POLICY "select_all_players_basic" ON players FOR SELECT
TO authenticated USING (true);

-- ============ POLICIES: clubs ============

DROP POLICY IF EXISTS "select_clubs_member" ON clubs;
CREATE POLICY "select_clubs_member" ON clubs FOR SELECT
TO authenticated USING (
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = clubs.id
    AND club_members.user_id = auth.uid()
    AND club_members.status = 'active'
  )
);

DROP POLICY IF EXISTS "insert_clubs_creator" ON clubs;
CREATE POLICY "insert_clubs_creator" ON clubs FOR INSERT
TO authenticated WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "update_clubs_creator" ON clubs;
CREATE POLICY "update_clubs_creator" ON clubs FOR UPDATE
TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "delete_clubs_creator" ON clubs;
CREATE POLICY "delete_clubs_creator" ON clubs FOR DELETE
TO authenticated USING (creator_id = auth.uid());

-- ============ POLICIES: club_members ============

DROP POLICY IF EXISTS "select_members_own" ON club_members;
CREATE POLICY "select_members_own" ON club_members FOR SELECT
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM club_members cm2
    WHERE cm2.club_id = club_members.club_id
    AND cm2.user_id = auth.uid()
    AND cm2.status = 'active'
  )
);

DROP POLICY IF EXISTS "insert_members_own" ON club_members;
CREATE POLICY "insert_members_own" ON club_members FOR INSERT
TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_members_admin" ON club_members;
CREATE POLICY "update_members_admin" ON club_members FOR UPDATE
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM club_members cm2
    WHERE cm2.club_id = club_members.club_id
    AND cm2.user_id = auth.uid()
    AND cm2.role = 'admin'
    AND cm2.status = 'active'
  )
) WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM club_members cm2
    WHERE cm2.club_id = club_members.club_id
    AND cm2.user_id = auth.uid()
    AND cm2.role = 'admin'
    AND cm2.status = 'active'
  )
);

DROP POLICY IF EXISTS "delete_members_admin" ON club_members;
CREATE POLICY "delete_members_admin" ON club_members FOR DELETE
TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = club_members.club_id AND clubs.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM club_members cm2
    WHERE cm2.club_id = club_members.club_id
    AND cm2.user_id = auth.uid()
    AND cm2.role = 'admin'
    AND cm2.status = 'active'
  )
);

-- ============ POLICIES: matches ============

DROP POLICY IF EXISTS "select_matches_member" ON matches;
CREATE POLICY "select_matches_member" ON matches FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = matches.club_id
    AND club_members.user_id = auth.uid()
    AND club_members.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_matches_mod" ON matches;
CREATE POLICY "insert_matches_mod" ON matches FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = matches.club_id
    AND club_members.user_id = auth.uid()
    AND club_members.status = 'active'
    AND club_members.role IN ('admin', 'mod')
  )
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_matches_mod" ON matches;
CREATE POLICY "delete_matches_mod" ON matches FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM club_members
    WHERE club_members.club_id = matches.club_id
    AND club_members.user_id = auth.uid()
    AND club_members.status = 'active'
    AND club_members.role IN ('admin', 'mod')
  )
  OR EXISTS (
    SELECT 1 FROM clubs WHERE clubs.id = matches.club_id AND clubs.creator_id = auth.uid()
  )
);

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clubs_creator_id ON clubs(creator_id);
