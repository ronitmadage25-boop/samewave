-- ============================================================
-- MIGRATION 002: Ensure rooms are readable by anon users
-- (Public rooms should be discoverable without authentication)
-- Run this in the Supabase SQL Editor if rooms aren't showing
-- ============================================================

-- Ensure anon role can read public rooms
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT ON public.profiles TO anon;

-- Ensure the FK join from rooms to profiles works for anon reads
-- (profiles are already readable by all via profiles_read_public policy)

-- Also ensure daily_signals readable by anon (public feed)
GRANT SELECT ON public.daily_signals TO anon;
GRANT SELECT ON public.signal_reactions TO anon;

-- ============================================================
-- OPTIONAL: If you want to allow reads without auth at all
-- (the existing policy already handles this for public rooms)
-- ============================================================
-- Already set in 001:
-- CREATE POLICY "rooms_read_public" ON public.rooms
--   FOR SELECT USING (
--     visibility = 'public'
--     OR host_id = auth.uid()
--     OR EXISTS (...)
--   );
