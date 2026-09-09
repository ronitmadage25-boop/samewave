-- ============================================================
-- SameWave Complete Database Schema (Idempotent & Safe)
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/cewugwkgftolebynohqp/editor
-- ============================================================

-- 1. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT 'Wave Rider',
  avatar_url    TEXT,
  initials      TEXT NOT NULL DEFAULT 'WR',
  email         TEXT,
  bio           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill existing auth.users if any exist
INSERT INTO public.profiles (id, display_name, initials, email)
SELECT
  id,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'display_name',
    SPLIT_PART(email, '@', 1),
    'Wave Rider'
  ),
  'WR',
  email
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _name TEXT;
  _initials TEXT;
  _avatar TEXT;
BEGIN
  _name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    SPLIT_PART(NEW.email, '@', 1),
    'Wave Rider'
  );
  _avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );
  SELECT UPPER(STRING_AGG(LEFT(word, 1), ''))
  INTO _initials
  FROM (
    SELECT UNNEST(STRING_TO_ARRAY(_name, ' ')) AS word LIMIT 2
  ) parts;
  _initials := COALESCE(NULLIF(_initials, ''), 'WR');

  INSERT INTO public.profiles (id, display_name, avatar_url, initials, email)
  VALUES (NEW.id, _name, _avatar, _initials, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        initials = EXCLUDED.initials,
        email = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'text',
  category        TEXT NOT NULL DEFAULT 'Tech',
  visibility      TEXT NOT NULL DEFAULT 'public',
  status          TEXT NOT NULL DEFAULT 'active',
  capacity        INTEGER NOT NULL DEFAULT 32,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  tools           TEXT[] NOT NULL DEFAULT ARRAY['reactions', 'thought-graph'],
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.set_room_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + (NEW.duration_minutes * INTERVAL '1 minute');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rooms_set_expires_at ON public.rooms;
CREATE TRIGGER rooms_set_expires_at
  BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_room_expires_at();

CREATE INDEX IF NOT EXISTS rooms_status_created ON public.rooms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS rooms_category ON public.rooms(category);

-- ============================================================
-- 4. ROOM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.room_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS room_members_active ON public.room_members(room_id, left_at) WHERE left_at IS NULL;

-- ============================================================
-- 5. MESSAGES (Thoughts in room)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'thought',
  content      TEXT NOT NULL,
  code         TEXT,
  language     TEXT,
  url          TEXT,
  poll_options JSONB,
  is_priority  BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id    UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS messages_room ON public.messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS messages_author ON public.messages(author_id);

-- ============================================================
-- 6. THOUGHT CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thought_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  from_message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  to_message_id    UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  relationship     TEXT NOT NULL DEFAULT 'relates-to',
  created_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_message_id, to_message_id)
);

CREATE INDEX IF NOT EXISTS thought_connections_room ON public.thought_connections(room_id);

-- ============================================================
-- 7. REACTIONS (In-room messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS reactions_message ON public.reactions(message_id);
CREATE INDEX IF NOT EXISTS reactions_user ON public.reactions(user_id);

-- ============================================================
-- 8. DAILY SIGNALS (Today's Thought - 1 per user per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 4 AND 280),
  signal_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, signal_date)
);

CREATE INDEX IF NOT EXISTS daily_signals_date ON public.daily_signals(signal_date DESC);
CREATE INDEX IF NOT EXISTS daily_signals_user ON public.daily_signals(user_id);

-- ============================================================
-- 9. SIGNAL REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signal_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   UUID NOT NULL REFERENCES public.daily_signals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (signal_id, user_id)
);

CREATE INDEX IF NOT EXISTS signal_reactions_signal ON public.signal_reactions(signal_id);

-- ============================================================
-- 10. SAVED MOMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_moments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id               UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_title            TEXT NOT NULL,
  room_type             TEXT NOT NULL DEFAULT 'text',
  minds_gathered        INTEGER NOT NULL DEFAULT 0,
  thoughts_shared       INTEGER NOT NULL DEFAULT 0,
  connections_formed    INTEGER NOT NULL DEFAULT 0,
  perspectives_emerged  INTEGER NOT NULL DEFAULT 0,
  highlight_thoughts    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  saved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_moments_user ON public.saved_moments(user_id, saved_at DESC);

-- ============================================================
-- 11. ACTIVITY EVENTS (Global stream)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id       UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  room_label    TEXT,
  room_type     TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_created ON public.activity_events(created_at DESC);

-- ============================================================
-- 12. HELPER VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.rooms_with_counts AS
SELECT
  r.*,
  p.display_name AS host_name,
  p.avatar_url AS host_avatar,
  p.initials AS host_initials,
  COALESCE(mc.member_count, 0) AS member_count
FROM public.rooms r
LEFT JOIN public.profiles p ON p.id = r.host_id
LEFT JOIN (
  SELECT room_id, COUNT(*) AS member_count
  FROM public.room_members
  WHERE left_at IS NULL
  GROUP BY room_id
) mc ON mc.room_id = r.id;

-- ============================================================
-- 13. REALTIME PUBLICATION
-- ============================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.thought_connections; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_signals; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_reactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_moments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- ── PROFILES POLICIES ──
DROP POLICY IF EXISTS "profiles_read_public" ON public.profiles;
CREATE POLICY "profiles_read_public" ON public.profiles
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── ROOMS POLICIES ──
DROP POLICY IF EXISTS "rooms_read_public" ON public.rooms;
CREATE POLICY "rooms_read_public" ON public.rooms
  FOR SELECT USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid() AND rm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "rooms_insert_auth" ON public.rooms;
CREATE POLICY "rooms_insert_auth" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND host_id = auth.uid());

DROP POLICY IF EXISTS "rooms_update_host" ON public.rooms;
CREATE POLICY "rooms_update_host" ON public.rooms
  FOR UPDATE USING (host_id = auth.uid());

DROP POLICY IF EXISTS "rooms_delete_host" ON public.rooms;
CREATE POLICY "rooms_delete_host" ON public.rooms
  FOR DELETE USING (host_id = auth.uid());

-- ── ROOM MEMBERS POLICIES ──
DROP POLICY IF EXISTS "room_members_read" ON public.room_members;
CREATE POLICY "room_members_read" ON public.room_members
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "room_members_join" ON public.room_members;
CREATE POLICY "room_members_join" ON public.room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "room_members_leave" ON public.room_members;
CREATE POLICY "room_members_leave" ON public.room_members
  FOR UPDATE USING (auth.uid() = user_id);

-- ── MESSAGES POLICIES ──
DROP POLICY IF EXISTS "messages_read" ON public.messages;
CREATE POLICY "messages_read" ON public.messages
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE USING (auth.uid() = author_id);

-- ── THOUGHT CONNECTIONS POLICIES ──
DROP POLICY IF EXISTS "connections_read" ON public.thought_connections;
CREATE POLICY "connections_read" ON public.thought_connections
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "connections_insert" ON public.thought_connections;
CREATE POLICY "connections_insert" ON public.thought_connections
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ── REACTIONS POLICIES ──
DROP POLICY IF EXISTS "reactions_read" ON public.reactions;
CREATE POLICY "reactions_read" ON public.reactions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "reactions_insert" ON public.reactions;
CREATE POLICY "reactions_insert" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_delete_own" ON public.reactions;
CREATE POLICY "reactions_delete_own" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── DAILY SIGNALS POLICIES ──
DROP POLICY IF EXISTS "signals_read" ON public.daily_signals;
CREATE POLICY "signals_read" ON public.daily_signals
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "signals_insert_own" ON public.daily_signals;
CREATE POLICY "signals_insert_own" ON public.daily_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "signals_delete_own" ON public.daily_signals;
CREATE POLICY "signals_delete_own" ON public.daily_signals
  FOR DELETE USING (auth.uid() = user_id);

-- ── SIGNAL REACTIONS POLICIES ──
DROP POLICY IF EXISTS "signal_reactions_read" ON public.signal_reactions;
CREATE POLICY "signal_reactions_read" ON public.signal_reactions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "signal_reactions_insert_own" ON public.signal_reactions;
CREATE POLICY "signal_reactions_insert_own" ON public.signal_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "signal_reactions_update_own" ON public.signal_reactions;
CREATE POLICY "signal_reactions_update_own" ON public.signal_reactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "signal_reactions_delete_own" ON public.signal_reactions;
CREATE POLICY "signal_reactions_delete_own" ON public.signal_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── SAVED MOMENTS POLICIES ──
DROP POLICY IF EXISTS "saved_moments_select_own" ON public.saved_moments;
CREATE POLICY "saved_moments_select_own" ON public.saved_moments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_moments_insert_own" ON public.saved_moments;
CREATE POLICY "saved_moments_insert_own" ON public.saved_moments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_moments_delete_own" ON public.saved_moments;
CREATE POLICY "saved_moments_delete_own" ON public.saved_moments
  FOR DELETE USING (auth.uid() = user_id);

-- ── ACTIVITY EVENTS POLICIES ──
DROP POLICY IF EXISTS "activity_events_read" ON public.activity_events;
CREATE POLICY "activity_events_read" ON public.activity_events
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "activity_events_insert" ON public.activity_events;
CREATE POLICY "activity_events_insert" ON public.activity_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 15. GRANTS FOR ROLES
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.daily_signals TO anon;
GRANT SELECT ON public.signal_reactions TO anon;
GRANT SELECT ON public.activity_events TO anon;
GRANT SELECT ON public.rooms_with_counts TO anon, authenticated;
