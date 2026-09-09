-- ============================================================
-- SameWave Initial Database Schema
-- Run this once in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/cewugwkgftolebynohqp/editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- Synced from auth.users on first sign-in
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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  -- Build initials from name (up to 2 chars)
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
-- ROOMS
-- ============================================================
CREATE TYPE public.room_type AS ENUM ('text', 'audio', 'video');
CREATE TYPE public.room_category AS ENUM ('Tech', 'Creative', 'Social', 'Lifestyle');
CREATE TYPE public.room_visibility AS ENUM ('public', 'private', 'invite');
CREATE TYPE public.room_status AS ENUM ('active', 'ended', 'cancelled');

CREATE TABLE IF NOT EXISTS public.rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            public.room_type NOT NULL DEFAULT 'text',
  category        public.room_category NOT NULL DEFAULT 'Tech',
  visibility      public.room_visibility NOT NULL DEFAULT 'public',
  status          public.room_status NOT NULL DEFAULT 'active',
  capacity        INTEGER NOT NULL DEFAULT 20 CHECK (capacity BETWEEN 2 AND 200),
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes BETWEEN 5 AND 480),
  tools           TEXT[] NOT NULL DEFAULT ARRAY['reactions', 'thought-graph'],
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set expires_at on insert if not provided
CREATE OR REPLACE FUNCTION public.set_room_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + (NEW.duration_minutes * INTERVAL '1 minute');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_set_expires_at
  BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_room_expires_at();

-- Index for discovery queries
CREATE INDEX IF NOT EXISTS rooms_status_created ON public.rooms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS rooms_category ON public.rooms(category);

-- ============================================================
-- ROOM MEMBERS
-- ============================================================
CREATE TYPE public.member_role AS ENUM ('host', 'member');

CREATE TABLE IF NOT EXISTS public.room_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.member_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS room_members_user ON public.room_members(user_id);
-- Active members (left_at IS NULL)
CREATE INDEX IF NOT EXISTS room_members_active ON public.room_members(room_id, left_at) WHERE left_at IS NULL;

-- ============================================================
-- MESSAGES (Thoughts)
-- ============================================================
CREATE TYPE public.message_type AS ENUM ('thought', 'question', 'code', 'link', 'poll', 'image');

CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         public.message_type NOT NULL DEFAULT 'thought',
  content      TEXT NOT NULL,
  -- Optional rich content fields
  code         TEXT,
  language     TEXT,
  url          TEXT,
  poll_options JSONB,  -- [{id, label, votes}]
  -- Metadata
  is_priority  BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id    UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS messages_room ON public.messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS messages_author ON public.messages(author_id);
CREATE INDEX IF NOT EXISTS messages_parent ON public.messages(parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================
-- THOUGHT CONNECTIONS
-- ============================================================
CREATE TYPE public.connection_relationship AS ENUM ('builds-on', 'relates-to', 'challenges', 'extends');

CREATE TABLE IF NOT EXISTS public.thought_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  from_message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  to_message_id    UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  relationship     public.connection_relationship NOT NULL DEFAULT 'relates-to',
  created_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate connections between same pair
  UNIQUE (from_message_id, to_message_id)
);

CREATE INDEX IF NOT EXISTS thought_connections_room ON public.thought_connections(room_id);
CREATE INDEX IF NOT EXISTS thought_connections_from ON public.thought_connections(from_message_id);
CREATE INDEX IF NOT EXISTS thought_connections_to ON public.thought_connections(to_message_id);

-- ============================================================
-- REACTIONS
-- ============================================================
CREATE TYPE public.reaction_type AS ENUM (
  'relate', 'made-me-think', 'tell-me-more', 'different-take', 'inspired', 'made-me-pause'
);

CREATE TABLE IF NOT EXISTS public.reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction     public.reaction_type NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One reaction type per user per message
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS reactions_message ON public.reactions(message_id);
CREATE INDEX IF NOT EXISTS reactions_user ON public.reactions(user_id);

-- ============================================================
-- DAILY SIGNALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 10 AND 280),
  signal_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One signal per user per day
  UNIQUE (user_id, signal_date)
);

CREATE INDEX IF NOT EXISTS daily_signals_date ON public.daily_signals(signal_date DESC);
CREATE INDEX IF NOT EXISTS daily_signals_user ON public.daily_signals(user_id);

-- ============================================================
-- SIGNAL REACTIONS
-- ============================================================
CREATE TYPE public.signal_reaction_type AS ENUM (
  'resonated', 'inspired', 'made-me-pause', 'different-perspective'
);

CREATE TABLE IF NOT EXISTS public.signal_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   UUID NOT NULL REFERENCES public.daily_signals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction    public.signal_reaction_type NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One reaction per user per signal
  UNIQUE (signal_id, user_id)
);

CREATE INDEX IF NOT EXISTS signal_reactions_signal ON public.signal_reactions(signal_id);

-- ============================================================
-- SAVED MOMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_moments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id               UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_title            TEXT NOT NULL,
  room_type             public.room_type NOT NULL DEFAULT 'text',
  minds_gathered        INTEGER NOT NULL DEFAULT 0,
  thoughts_shared       INTEGER NOT NULL DEFAULT 0,
  connections_formed    INTEGER NOT NULL DEFAULT 0,
  highlight_thoughts    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  saved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_moments_user ON public.saved_moments(user_id, saved_at DESC);

-- ============================================================
-- ACTIVITY EVENTS (Global feed)
-- ============================================================
CREATE TYPE public.activity_event_type AS ENUM (
  'room-created', 'joined-room', 'thought-posted', 'connection-created',
  'signal-published', 'room-ended', 'moment-saved', 'priority-question',
  'audio-room-started', 'video-room-started', 'participant-joined', 'participant-left',
  'reaction-received', 'whiteboard-activity'
);

CREATE TABLE IF NOT EXISTS public.activity_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id       UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  event_type    public.activity_event_type NOT NULL,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  room_label    TEXT,
  room_type     public.room_type,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_created ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_room ON public.activity_events(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_user ON public.activity_events(user_id, created_at DESC);

-- ============================================================
-- ENABLE REALTIME
-- Enable row-level change broadcast for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thought_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
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

-- ── PROFILES ────────────────────────────────────────────────
-- Anyone can read profiles (public discovery)
CREATE POLICY "profiles_read_public" ON public.profiles
  FOR SELECT USING (TRUE);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Profile insert handled by trigger (SECURITY DEFINER)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── ROOMS ────────────────────────────────────────────────────
-- Public rooms visible to everyone; private rooms visible to members only
CREATE POLICY "rooms_read_public" ON public.rooms
  FOR SELECT USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = rooms.id AND rm.user_id = auth.uid() AND rm.left_at IS NULL
    )
  );

-- Authenticated users can create rooms
CREATE POLICY "rooms_insert_auth" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND host_id = auth.uid());

-- Only the host can update/end the room
CREATE POLICY "rooms_update_host" ON public.rooms
  FOR UPDATE USING (host_id = auth.uid());

-- Only the host can delete (soft-delete via status change preferred)
CREATE POLICY "rooms_delete_host" ON public.rooms
  FOR DELETE USING (host_id = auth.uid());

-- ── ROOM MEMBERS ────────────────────────────────────────────
-- Members can read member list of rooms they can see
CREATE POLICY "room_members_read" ON public.room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_members.room_id
        AND (r.visibility = 'public' OR r.host_id = auth.uid()
          OR room_members.user_id = auth.uid())
    )
  );

-- Authenticated users can join (insert themselves)
CREATE POLICY "room_members_join" ON public.room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership (to leave)
CREATE POLICY "room_members_leave" ON public.room_members
  FOR UPDATE USING (auth.uid() = user_id);

-- ── MESSAGES ────────────────────────────────────────────────
-- Members of a room can read messages
CREATE POLICY "messages_read" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = messages.room_id
        AND (r.visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM public.room_members rm
            WHERE rm.room_id = messages.room_id AND rm.user_id = auth.uid()
          ))
    )
  );

-- Active members can post messages
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = messages.room_id
        AND rm.user_id = auth.uid()
        AND rm.left_at IS NULL
    )
  );

-- Authors can update their own messages
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (auth.uid() = author_id);

-- Authors can delete their own messages
CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE USING (auth.uid() = author_id);

-- ── THOUGHT CONNECTIONS ──────────────────────────────────────
CREATE POLICY "connections_read" ON public.thought_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = thought_connections.room_id
        AND (r.visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM public.room_members rm
            WHERE rm.room_id = thought_connections.room_id AND rm.user_id = auth.uid()
          ))
    )
  );

CREATE POLICY "connections_insert" ON public.thought_connections
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = thought_connections.room_id
        AND rm.user_id = auth.uid()
        AND rm.left_at IS NULL
    )
  );

-- ── REACTIONS ───────────────────────────────────────────────
CREATE POLICY "reactions_read" ON public.reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.rooms r ON r.id = m.room_id
      WHERE m.id = reactions.message_id
        AND (r.visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM public.room_members rm
            WHERE rm.room_id = r.id AND rm.user_id = auth.uid()
          ))
    )
  );

CREATE POLICY "reactions_insert" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_update_own" ON public.reactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── DAILY SIGNALS ────────────────────────────────────────────
-- Anyone can read today's signals
CREATE POLICY "signals_read" ON public.daily_signals
  FOR SELECT USING (TRUE);

CREATE POLICY "signals_insert_own" ON public.daily_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── SIGNAL REACTIONS ─────────────────────────────────────────
CREATE POLICY "signal_reactions_read" ON public.signal_reactions
  FOR SELECT USING (TRUE);

CREATE POLICY "signal_reactions_insert_own" ON public.signal_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "signal_reactions_update_own" ON public.signal_reactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "signal_reactions_delete_own" ON public.signal_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── SAVED MOMENTS ────────────────────────────────────────────
CREATE POLICY "saved_moments_own" ON public.saved_moments
  FOR ALL USING (auth.uid() = user_id);

-- ── ACTIVITY EVENTS ──────────────────────────────────────────
-- Public events readable by all
CREATE POLICY "activity_events_read" ON public.activity_events
  FOR SELECT USING (TRUE);

-- Authenticated users can insert events
CREATE POLICY "activity_events_insert" ON public.activity_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Rooms with live member count (for discovery page)
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

-- Grant access to the view
GRANT SELECT ON public.rooms_with_counts TO anon, authenticated;
