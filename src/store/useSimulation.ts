/**
 * useSimulation — DISABLED for real rooms.
 * 
 * The simulation engine has been removed. This hook is kept as a no-op
 * to avoid breaking any remaining imports, but it does nothing.
 * 
 * Real rooms use Supabase Realtime for presence and thought updates.
 */
export function useSimulation(_active: boolean) {
  // No-op: simulation removed in favor of real Supabase Realtime
}
